import type { Env } from '../utils/types'
import { errorResponse, successResponse } from '../utils/response'

export async function handleWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json()
    console.log('Webhook received:', JSON.stringify(body, null, 2))

    const { event } = body
    if (!event) {
      return errorResponse(new Error('Invalid webhook payload'), 400)
    }

    const { boardId, itemId, columnId, value, type, pulseId } = event

    // Handle different event types from Monday
    let eventType = type
    if (type === 'create_pulse') {
      eventType = 'create_pulse'
    } else if (type === 'update_column_value' || type === 'change_column_value') {
      eventType = 'change_column_value'
    }

    // Find matching integrations
    const integrations = await env.DB.prepare(`
      SELECT i.*, t.subject, t.body, t.attachments
      FROM integrations i
      LEFT JOIN templates t ON i.template_id = t.id
      WHERE i.board_id = ?
    `)
      .bind(boardId)
      .all()

    for (const integration of integrations.results as any[]) {
      const shouldTrigger = evaluateTrigger(integration, eventType, columnId, value, pulseId)

      if (shouldTrigger) {
        // Send email asynchronously
        sendEmailAsync(env, integration.id, itemId, boardId)
      }
    }

    return successResponse({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return errorResponse(error, 500)
  }
}

function evaluateTrigger(
  integration: any,
  eventType: string,
  columnId: string,
  value: any,
  pulseId?: string
): boolean {
  const { recipe_type, trigger_column, trigger_value } = integration

  switch (recipe_type) {
    case 'status_change':
      return (
        eventType === 'change_column_value' &&
        columnId === trigger_column &&
        value?.label === trigger_value
      )

    case 'date_reached':
      return (
        eventType === 'change_column_value' &&
        columnId === trigger_column &&
        isToday(value?.date)
      )

    case 'person_assigned':
      return (
        eventType === 'change_column_value' &&
        columnId === trigger_column &&
        value?.personsAndTeams?.length > 0
      )

    case 'item_created':
      return eventType === 'create_pulse'

    case 'item_updated':
      return eventType === 'update_column_value'

    case 'button_click':
      return (
        eventType === 'change_column_value' &&
        columnId === trigger_column &&
        value?.pressed === true
      )

    default:
      return false
  }
}

function isToday(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

async function sendEmailAsync(
  env: Env,
  integrationId: number,
  itemId: string,
  boardId: string
): Promise<void> {
  // Use Cloudflare Queues or simple setTimeout for async processing
  // For now, we'll use a simple approach
  setTimeout(async () => {
    try {
      const { sendEmail } = await import('./email')
      await sendEmail(env, integrationId, itemId, boardId)
    } catch (error) {
      console.error('Error in async email send:', error)
    }
  }, 0)
}
