import type { Env } from "../utils/types";
import {
  errorResponse,
  successResponse,
  jsonResponse,
} from "../utils/response";
import { sendEmail } from "./email";

export async function handleWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = await request.json();

    // Handle Monday challenge verification
    if (body.challenge) {
      return jsonResponse({ challenge: body.challenge });
    }

    const { event } = body;
    if (!event) {
      return errorResponse(new Error("Invalid webhook payload"), 400);
    }

    const { boardId, itemId, columnId, value, type, pulseId } = event;

    // Handle different event types from Monday
    const eventType = type; // Keep original type to avoid duplication logic errors


    // Find matching integrations
    const integrations = await env.DB.prepare(
      `
      SELECT i.*, t.subject, t.body, t.attachments
      FROM integrations i
      LEFT JOIN templates t ON i.template_id = t.id
      WHERE i.board_id = ?
    `,
    )
      .bind(String(boardId))
      .all();

    for (const integration of integrations.results as any[]) {
      const shouldTrigger = evaluateTrigger(
        integration,
        eventType,
        columnId,
        value,
        pulseId,
        event // Pass the full event object
      );
      console.log(
        `Integration ${integration.id} (type: ${integration.recipe_type}) trigger evaluation: ${shouldTrigger}`,
      );

      if (shouldTrigger) {
        // 1. Strict Anti-duplication Check (Locking mechanism)
        const recentLog = await env.DB.prepare(
          `
          SELECT id FROM email_logs 
          WHERE integration_id = ? AND item_id = ? 
          AND sent_at > datetime('now', '-30 seconds')
          LIMIT 1
        `,
        )
          .bind(integration.id, String(itemId || pulseId))
          .first();

        if (recentLog) {
          console.log(`[Duplicate Block] Already processing/sent for Integration ${integration.id}, Item ${itemId || pulseId}`);
          continue;
        }

        // 2. Create an immediate "processing" lock
        await env.DB.prepare(
          `
          INSERT INTO email_logs (board_id, item_id, template_id, integration_id, recipient, status)
          VALUES (?, ?, ?, ?, ?, 'processing')
        `,
        )
          .bind(boardId, String(itemId || pulseId), integration.template_id, integration.id, "pending")
          .run();

        console.log(`[Webhook] Lock created. Triggering sendEmail workflow`);
        // 3. Send email using the updated email handler
        try {
          const emailResponse = await sendEmail(
            env,
            integration.id,
            String(itemId || pulseId),
            String(boardId),
          );

          if (emailResponse.results?.some((r: any) => r.status === "sent")) {
            console.log(`[Webhook] Success: Email workflow completed for integration ${integration.id}`);
          } else {
            console.error(`[Webhook] Failed: Email workflow could not send email for integration ${integration.id}`);
          }
        } catch (error: any) {
          console.error(`[Webhook] Critical Error in Email workflow:`, error);
        }
      }
    }

    return successResponse({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return errorResponse(error, 500);
  }
}

function evaluateTrigger(
  integration: any,
  eventType: string,
  columnId: string,
  value: any,
  pulseId?: string,
  event?: any // Add full event for batch processing
): boolean {
  const { recipe_type, trigger_column, trigger_value } = integration;

  // Helper to check if a specific change matches our trigger
  const isMatch = (cid: string, val: any) => {
    switch (recipe_type) {
      case "status_change":
        return cid === trigger_column && val?.label?.text === trigger_value;
      case "date_reached":
        return cid === trigger_column && isToday(val?.date);
      case "person_assigned":
        return cid === trigger_column && val?.personsAndTeams?.length > 0;
      case "button_click":
        return cid === trigger_column && val?.pressed === true;
      default:
        return false;
    }
  };

  if (eventType === "change_column_value" || eventType === "update_column_value") {
    return isMatch(columnId, value);
  }

  if (eventType === "batch_change_column_value" && event?.column_values) {
    // Check if any of the changed columns in the batch match our trigger
    // In batch, column_values is often an object with column IDs as keys
    for (const [cid, val] of Object.entries(event.column_values)) {
      if (isMatch(cid, val)) return true;
    }
  }

  if (recipe_type === "item_created" && eventType === "create_pulse") {
    return true;
  }

  return false;
}

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
