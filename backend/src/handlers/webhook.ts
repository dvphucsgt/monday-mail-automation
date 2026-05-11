import type { Env } from "../utils/types";
import {
  errorResponse,
  successResponse,
  jsonResponse,
} from "../utils/response";

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
    let eventType = type;
    if (type === "create_pulse") {
      eventType = "create_pulse";
    } else if (
      type === "update_column_value" ||
      type === "change_column_value"
    ) {
      eventType = "change_column_value";
    }

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
      );
      console.log(
        `Integration ${integration.id} (type: ${integration.recipe_type}) trigger evaluation: ${shouldTrigger}`,
      );

      if (shouldTrigger) {
        console.log(
          `Triggering email for integration ${integration.id}, itemId: ${itemId || pulseId}`,
        );
        // Import and send email directly, waiting for it to finish
        try {
          const { sendEmail } = await import("./email");
          const emailResponse = await sendEmail(
            env,
            integration.id,
            itemId || pulseId,
            String(boardId),
          );

          const failed = emailResponse.results.find(
            (r: any) => r.status === "failed",
          );
          if (failed) {
            console.error(
              `Email failed for integration ${integration.id}: ${failed.error}`,
            );
          } else if (emailResponse.results.length > 0) {
            console.log(
              `Email sent successfully for integration ${integration.id}`,
            );
          }
        } catch (error) {
          console.error(
            `Error sending email for integration ${integration.id}:`,
            error,
          );
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
): boolean {
  const { recipe_type, trigger_column, trigger_value } = integration;

  switch (recipe_type) {
    case "status_change":
      return (
        eventType === "change_column_value" &&
        columnId === trigger_column &&
        value?.label?.text === trigger_value
      );

    case "date_reached":
      return (
        eventType === "change_column_value" &&
        columnId === trigger_column &&
        isToday(value?.date)
      );

    case "person_assigned":
      return (
        eventType === "change_column_value" &&
        columnId === trigger_column &&
        value?.personsAndTeams?.length > 0
      );

    case "item_created":
      return eventType === "create_pulse";

    case "item_updated":
      return eventType === "update_column_value";

    case "button_click":
      return (
        eventType === "change_column_value" &&
        columnId === trigger_column &&
        value?.pressed === true
      );

    default:
      return false;
  }
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
