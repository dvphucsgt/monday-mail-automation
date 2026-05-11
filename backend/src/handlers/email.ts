import type { Env } from "../utils/types";
import { jsonResponse, errorResponse } from "../utils/response";
import CryptoJS from "crypto-js";

export async function handleEmail(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return errorResponse(new Error("Method not allowed"), 405);
    }

    const body = await request.json() as any;
    const { integration_id, item_id, board_id } = body;

    if (!integration_id || !item_id || !board_id) {
      return errorResponse(new Error("Missing required parameters"), 400);
    }

    const result = await sendEmail(env, integration_id, item_id, board_id);
    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error, 500);
  }
}

function decryptToken(encrypted: string, key: string) {
  if (!encrypted || !key) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error("  [Email] Decryption failed:", e);
    return "";
  }
}

export async function sendEmail(
  env: Env,
  integrationId: number,
  itemId: string,
  boardId: string,
): Promise<any> {
  console.log("🚀 [Email] Processing workflow...");
  
  // 1. Get Integration Data
  const integration = (await env.DB.prepare(
    `
    SELECT i.*, t.subject, t.body, t.attachments
    FROM integrations i
    LEFT JOIN templates t ON i.template_id = t.id
    WHERE i.id = ?
  `,
  )
    .bind(integrationId)
    .first()) as any;

  if (!integration) throw new Error("Integration not found");

  // 2. Fetch Item Data from Monday
  const mondayQuery = `
    query {
      items(ids: [${itemId}]) {
        id
        name
        column_values {
          id
          text
          value
          column {
            title
            type
          }
        }
      }
    }
  `;

  const mondayResponse = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MONDAY_API_KEY}`,
    },
    body: JSON.stringify({ query: mondayQuery }),
  });

  const mondayData = (await mondayResponse.json()) as any;
  const itemData = mondayData.data?.items?.[0];

  if (!itemData) throw new Error("Item not found on Monday");

  // 3. Resolve Recipients
  const recipients = extractRecipients(itemData);
  if (recipients.length === 0) {
    console.log("  [Email] No recipients found. Skipping.");
    return { success: false, reason: "no_recipients" };
  }

  // 4. Prepare Content & Attachments
  const subject = replaceVariables(integration.subject, itemData);
  const body = replaceVariables(integration.body, itemData);
  const attachments = await prepareAttachments(env, integration.attachments, itemData);

  console.log(`  [Email] Sending to: ${recipients.join(", ")} | Attachments: ${attachments.length}`);

  // 5. Send via Gmail
  const results = [];
  for (const recipient of recipients) {
    try {
      await sendViaGmail(env, boardId, recipient, subject, body, attachments);
      
      // Update DB Log
      const safeIntegrationId = Number(integrationId);
      const safeItemId = String(itemId);

      await env.DB.prepare(
        `UPDATE email_logs SET recipient = ?, status = 'sent', sent_at = CURRENT_TIMESTAMP 
         WHERE integration_id = ? AND item_id = ? AND status = 'processing'`
      ).bind(recipient, safeIntegrationId, safeItemId).run();
      
      results.push({ recipient, status: "sent" });
    } catch (err: any) {
      console.error(`  [Email] Failed for ${recipient}:`, err.message);
      
      const safeIntegrationId = Number(integrationId);
      const safeItemId = String(itemId);
      
      await env.DB.prepare(
        `UPDATE email_logs SET recipient = ?, status = 'failed', error = ?, sent_at = CURRENT_TIMESTAMP 
         WHERE integration_id = ? AND item_id = ? AND status = 'processing'`
      ).bind(recipient, err.message, safeIntegrationId, safeItemId).run();
      
      results.push({ recipient, status: "failed", error: err.message });
    }
  }

  return { results };
}

// --- HELPER FUNCTIONS ---

function extractRecipients(itemData: any): string[] {
  const recipients: string[] = [];
  for (const cv of itemData.column_values) {
    if (cv.column?.type === "email" && cv.text) {
      recipients.push(cv.text);
    }
  }
  return recipients;
}

function replaceVariables(template: string, itemData: any): string {
  if (!template) return "";
  const vars: Record<string, string> = {
    item_name: itemData.name || "",
    item_id: itemData.id || "",
  };

  for (const cv of itemData.column_values) {
    const val = cv.text || "";
    vars[cv.id] = val;
    if (cv.column?.title) {
      vars[cv.column.title.toLowerCase().replace(/\s+/g, "_")] = val;
    }
    if (cv.column?.type === "people" || cv.column?.type === "multiple-person") {
       vars["user_name"] = val;
    }
  }

  return template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
    const k = key.trim().toLowerCase().replace(/\s+/g, "_");
    return vars[k] !== undefined ? vars[k] : match;
  });
}

async function prepareAttachments(env: Env, configJson: string, itemData: any): Promise<any[]> {
  let config = [];
  try {
    config = JSON.parse(configJson || "[]");
  } catch (e) {
    console.error("  [Email] Failed to parse attachment config:", e);
    return [];
  }
  
  const result = [];

  for (const att of config) {
    let fileUrl = "";
    let useAuth = false;
    let fileName = att.name || "attachment";

    if (att.id && !att.column_id) {
       fileUrl = await getAssetUrl(env, att.id);
       useAuth = false;
    } 
    else if (att.column_id) {
      const cv = itemData.column_values.find((c: any) => 
        c.id === att.column_id || 
        c.column?.title === att.column_id
      );
      
      if (cv) {
        const rawText = (cv.text || "").trim();
        if (/^https?:\/\//.test(rawText)) {
          fileUrl = rawText;
          useAuth = rawText.includes("monday.com");
        } else if (cv.value) {
          const val = JSON.parse(cv.value);
          const file = val.files?.[0];
          if (file?.assetId) {
            fileUrl = await getAssetUrl(env, file.assetId);
            useAuth = false;
          }
        }
      }
    }

    if (fileUrl) {
      try {
        const resp = await fetch(fileUrl, {
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            ...(useAuth ? { Authorization: `Bearer ${env.MONDAY_API_KEY}` } : {}) 
          }
        });
        
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);
          
          result.push({ 
            name: fileName, 
            type: resp.headers.get("Content-Type") || "application/octet-stream", 
            data: base64 
          });
          console.log(`  [Email] Prepared: ${fileName} (${buffer.byteLength} bytes)`);
        }
      } catch (err) {
        console.error(`  [Email] Error downloading ${fileName}:`, err);
      }
    }
  }
  return result;
}

async function getAssetUrl(env: Env, assetId: any) {
  try {
    const resp = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.MONDAY_API_KEY}` },
      body: JSON.stringify({ query: `query { assets(ids:[${assetId}]){ public_url } }` })
    });
    const data = await resp.json() as any;
    return data.data?.assets?.[0]?.public_url;
  } catch (e) {
    return null;
  }
}

async function sendViaGmail(env: Env, boardId: string, to: string, subject: string, body: string, attachments: any[]) {
  const board = await env.DB.prepare("SELECT access_token FROM boards WHERE board_id = ?").bind(String(boardId)).first() as any;
  if (!board || !board.access_token) throw new Error("No Gmail account connected");

  const accessToken = decryptToken(board.access_token, env.ENCRYPTION_KEY);
  const boundary = "boundary_" + Math.random().toString(16).slice(2);
  let raw = `To: ${to}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=${boundary}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${body}\r\n\r\n`;

  for (const att of attachments) {
    raw += `--${boundary}\r\nContent-Type: ${att.type}\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.name}"\r\n\r\n${att.data}\r\n\r\n`;
  }
  raw += `--${boundary}--`;

  const gmailResp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") })
  });

  if (!gmailResp.ok) throw new Error(`Gmail API error: ${await gmailResp.text()}`);
}
