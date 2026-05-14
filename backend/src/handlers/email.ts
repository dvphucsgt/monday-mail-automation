import type { Env } from "../utils/types";
import { jsonResponse, errorResponse } from "../utils/response";
import CryptoJS from "crypto-js";

export async function handleEmail(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  try {
    // Route: POST /email/send-now
    if (url.pathname === "/email/send-now" && request.method === "POST") {
      return await handleSendNow(request, env);
    }

    // Route: POST /email (webhook-triggered)
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

async function handleSendNow(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { board_id, item_id, to, cc, bcc, subject, body: templateBody, attachments } = body;

  if (!board_id) {
    return errorResponse(new Error("board_id is required"), 400);
  }
  if (!to || !Array.isArray(to) || to.length === 0) {
    return errorResponse(new Error("At least one recipient (to) is required"), 400);
  }
  if (!subject || !templateBody) {
    return errorResponse(new Error("subject and body are required"), 400);
  }

  // Prepare attachments
  const preparedAttachments = await prepareAttachments(env, JSON.stringify(attachments || []), { column_values: [] });

  const allRecipients = [
    ...to.map((email: string) => ({ email, type: "to" })),
    ...(cc || []).map((email: string) => ({ email, type: "cc" })),
    ...(bcc || []).map((email: string) => ({ email, type: "bcc" })),
  ];

  const sharedItemData = item_id ? await fetchItemData(env, String(item_id)) : null;
  const boardItems = !sharedItemData && hasTemplateVariables(subject, templateBody)
    ? await fetchBoardItemsForSendNow(env, String(board_id))
    : [];

  const results = [];
  for (const r of allRecipients) {
    try {
      const matchedItem = sharedItemData || findItemForRecipient(boardItems, r.email);
      const resolvedSubject = matchedItem ? replaceVariables(subject, matchedItem) : subject;
      const resolvedBody = matchedItem ? replaceVariables(templateBody, matchedItem) : templateBody;

      await sendViaGmail(
        env,
        String(board_id),
        r.email,
        resolvedSubject,
        buildStyledEmailBody(resolvedBody),
        preparedAttachments,
      );
      results.push({ email: r.email, type: r.type, status: "sent" });
    } catch (err: any) {
      results.push({ email: r.email, type: r.type, status: "failed", error: err.message });
    }
  }

  const sent = results.filter(r => r.status === "sent").length;
  const failed = results.filter(r => r.status === "failed").length;

  return jsonResponse({ success: failed === 0, data: { results, summary: { total: results.length, sent, failed } } });
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

  // 2. Send using shared pipeline
  const result = await sendEmailForItem(
    env, integration.subject, integration.body, integration.attachments,
    itemId, boardId,
  );

  // 3. Update email_logs (webhook creates 'processing' entries)
  if (result.results) {
    for (const r of result.results) {
      const logStatus = r.status === "sent" ? "sent" : "failed";
      const logError = r.error || null;
      await env.DB.prepare(
        `UPDATE email_logs SET recipient = ?, status = ?, error = ?, sent_at = CURRENT_TIMESTAMP
         WHERE integration_id = ? AND item_id = ? AND status = 'processing'`
      ).bind(r.recipient, logStatus, logError, Number(integrationId), String(itemId)).run();
    }
  }

  return result;
}

async function sendEmailForItem(
  env: Env,
  subjectTemplate: string,
  bodyTemplate: string,
  attachmentsJson: string,
  itemId: string,
  boardId: string,
): Promise<any> {
  const itemData = await fetchItemData(env, itemId);

  // 2. Resolve Recipients
  const recipients = extractRecipients(itemData);
  if (recipients.length === 0) {
    return { success: false, reason: "no_recipients", itemName: itemData.name };
  }

  // 3. Prepare Content
  const subject = replaceVariables(subjectTemplate, itemData);
  const body = buildStyledEmailBody(replaceVariables(bodyTemplate, itemData));

  const attachments = await prepareAttachments(env, attachmentsJson, itemData);

  console.log(`  [Email] Sending to: ${recipients.join(", ")} | Attachments: ${attachments.length}`);

  // 4. Send via Gmail
  const results = [];
  for (const recipient of recipients) {
    try {
      await sendViaGmail(env, boardId, recipient, subject, body, attachments);
      results.push({ recipient, status: "sent" });
    } catch (err: any) {
      console.error(`  [Email] Failed for ${recipient}:`, err.message);
      results.push({ recipient, status: "failed", error: err.message });
    }
  }

  return { success: true, itemName: itemData.name, results };
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
    name: itemData.name || "",
    item_name: itemData.name || "",
    item_id: itemData.id || "",
    user_name: itemData.creator?.name || "",
    board_name: itemData.board?.name || "",
    group_name: itemData.group?.title || "",
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

function hasTemplateVariables(...templates: Array<string | undefined>): boolean {
  return templates.some((template) => /\{\{.+?\}\}/.test(template || ""));
}

function buildStyledEmailBody(body: string): string {
  const styledBody = `
    <style>
      img { max-width: 100% !important; height: auto !important; }
      body { font-family: Arial, sans-serif; line-height: 1.6; }
    </style>
    ${body}
  `;

  return styledBody.replace(/<img[^>]+style="[^"]*width:\s*(\d+)px;?[^"]*"[^>]*>/g, (match, p1) => {
    if (!match.includes('width=')) {
      return match.replace('<img', `<img width="${p1}"`);
    }
    return match;
  });
}

async function fetchItemData(env: Env, itemId: string): Promise<any> {
  const mondayData = await callMondayApi(env, `
    query {
      items(ids: [${itemId}]) {
        id
        name
        creator { name }
        board { name }
        group { title }
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
  `);

  const itemData = mondayData.data?.items?.[0];
  if (!itemData) {
    throw new Error("Item not found on Monday");
  }

  return itemData;
}

async function fetchBoardItemsForSendNow(env: Env, boardId: string): Promise<any[]> {
  const mondayData = await callMondayApi(env, `
    query {
      boards(ids: [${boardId}]) {
        name
        items_page(limit: 500) {
          items {
            id
            name
            creator { name }
            group { title }
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
      }
    }
  `);

  const board = mondayData.data?.boards?.[0];
  const boardName = board?.name || "";
  const items = board?.items_page?.items || [];

  return items.map((item: any) => ({
    ...item,
    board: item.board || { name: boardName },
  }));
}

async function callMondayApi(env: Env, query: string): Promise<any> {
  const mondayResponse = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MONDAY_API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  return await mondayResponse.json() as any;
}

function findItemForRecipient(items: any[], recipientEmail: string): any | null {
  const normalizedRecipient = normalizeEmail(recipientEmail);
  if (!normalizedRecipient) {
    return null;
  }

  return items.find((item) =>
    item.column_values?.some((cv: any) =>
      extractEmailsFromColumnValue(cv).some((email) => email === normalizedRecipient),
    ),
  ) || null;
}

function extractEmailsFromColumnValue(cv: any): string[] {
  const emails = new Set<string>();
  const type = cv.column?.type;

  if (type === "email") {
    const textEmail = normalizeEmail(cv.text);
    if (textEmail) {
      emails.add(textEmail);
    }

    try {
      const parsed = JSON.parse(cv.value || "{}");
      const valueEmail = normalizeEmail(parsed.email || parsed.text);
      if (valueEmail) {
        emails.add(valueEmail);
      }
    } catch {
      // Ignore malformed Monday email payloads and fall back to text.
    }
  }

  if ((type === "people" || type === "multiple-person") && cv.value) {
    try {
      const parsed = JSON.parse(cv.value);
      const people = Array.isArray(parsed?.personsOrTeams)
        ? parsed.personsOrTeams
        : Array.isArray(parsed?.personsAndTeams)
          ? parsed.personsAndTeams
          : [];

      for (const person of people) {
        const email = normalizeEmail(person?.email);
        if (email) {
          emails.add(email);
        }
      }
    } catch {
      // Ignore malformed Monday people payloads.
    }
  }

  return [...emails];
}

function normalizeEmail(email: string | undefined): string {
  return (email || "").trim().toLowerCase();
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
  const board = await env.DB.prepare("SELECT access_token, refresh_token FROM boards WHERE board_id = ?").bind(String(boardId)).first() as any;
  if (!board || !board.access_token) throw new Error("No Gmail account connected");

  let accessToken = decryptToken(board.access_token, env.ENCRYPTION_KEY);
  const refreshToken = decryptToken(board.refresh_token || "", env.ENCRYPTION_KEY);

  // Try sending with current token
  let gmailResp = await sendGmailRequest(accessToken, to, subject, body, attachments);

  // If 401, refresh token and retry
  if (gmailResp.status === 401 && refreshToken) {
    console.log("  [Email] Access token expired, refreshing...");
    const newToken = await refreshGmailAccessToken(env, refreshToken);
    if (newToken) {
      accessToken = newToken;
      // Update database with new access token
      const encryptedNewToken = CryptoJS.AES.encrypt(newToken, env.ENCRYPTION_KEY).toString();
      await env.DB.prepare("UPDATE boards SET access_token = ? WHERE board_id = ?")
        .bind(encryptedNewToken, String(boardId))
        .run();
      // Retry with new token
      gmailResp = await sendGmailRequest(accessToken, to, subject, body, attachments);
    }
  }

  if (!gmailResp.ok) throw new Error(`Gmail API error: ${await gmailResp.text()}`);
}

async function refreshGmailAccessToken(env: Env, refreshToken: string): Promise<string | null> {
  try {
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.access_token;
  } catch (e) {
    console.error("  [Email] Failed to refresh token:", e);
    return null;
  }
}

async function sendGmailRequest(accessToken: string, to: string, subject: string, body: string, attachments: any[]): Promise<Response> {
  const boundary = "boundary_" + Math.random().toString(16).slice(2);
  let raw = `To: ${to}\r\nSubject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=${boundary}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${body}\r\n\r\n`;

  for (const att of attachments) {
    raw += `--${boundary}\r\nContent-Type: ${att.type}\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.name}"\r\n\r\n${att.data}\r\n\r\n`;
  }
  raw += `--${boundary}--`;

  return await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") })
  });
}
