import type { Env, Integration } from '../utils/types'
import { errorResponse, successResponse } from '../utils/response'
import { ValidationError, NotFoundError } from '../utils/errors'
import { verifyAuth } from '../utils/auth'

export async function handleIntegrations(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const path = url.pathname

  // Verify auth for all integration routes
  const auth = verifyAuth(request, env, url)
  if (!auth.isValid) {
    return errorResponse(new Error(auth.error), auth.status || 401)
  }
  const jwtPayload = auth.payload

  // GET /integrations?board_id=xxx
  if (path === '/integrations' && request.method === 'GET') {
    const boardId = url.searchParams.get('board_id')
    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    const integrations = await env.DB.prepare(`
      SELECT i.*, t.name as template_name
      FROM integrations i
      LEFT JOIN templates t ON i.template_id = t.id
      WHERE i.board_id = ?
      ORDER BY i.created_at DESC
    `)
      .bind(boardId)
      .all()

    return successResponse({ integrations: integrations.results })
  }

  // POST /integrations?board_id=xxx
  if (path === '/integrations' && request.method === 'POST') {
    const boardId = url.searchParams.get('board_id')
    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    const body = await request.json()
    const {
      template_id,
      recipe_type,
      trigger_column,
      trigger_value,
      recipient_columns,
      cc_enabled
    } = body

    if (!template_id || !recipe_type || !recipient_columns) {
      return errorResponse(
        new ValidationError(
          'template_id, recipe_type, and recipient_columns are required'
        ),
        400
      )
    }

    const result = await env.DB.prepare(`
      INSERT INTO integrations (
        board_id, template_id, recipe_type, trigger_column,
        trigger_value, recipient_columns, cc_enabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        boardId,
        template_id,
        recipe_type,
        trigger_column || null,
        trigger_value || null,
        JSON.stringify(recipient_columns),
        cc_enabled ? 1 : 0
      )
      .run()

    // Create webhook
    const webhookId = await createMondayWebhook(env, boardId, result.meta.last_row_id)

    if (webhookId) {
      await env.DB.prepare(`
        INSERT INTO webhooks (board_id, webhook_id, integration_id)
        VALUES (?, ?, ?)
      `)
        .bind(boardId, webhookId, result.meta.last_row_id)
        .run()
    }

    const integration = await env.DB.prepare(
      'SELECT * FROM integrations WHERE id = ?'
    )
      .bind(result.meta.last_row_id)
      .first() as Integration

    return successResponse(
      { integration, webhook_id: webhookId },
      'Integration created successfully'
    )
  }

  // PUT /integrations/:id
  if (path.startsWith('/integrations/') && request.method === 'PUT') {
    const integrationId = parseInt(path.split('/').pop()!)
    const body = await request.json()
    const {
      template_id,
      recipe_type,
      trigger_column,
      trigger_value,
      recipient_columns,
      cc_enabled
    } = body

    const existing = await env.DB.prepare(
      'SELECT * FROM integrations WHERE id = ?'
    )
      .bind(integrationId)
      .first()

    if (!existing) {
      return errorResponse(new NotFoundError('Integration not found'), 404)
    }

    await env.DB.prepare(`
      UPDATE integrations
      SET template_id = ?, recipe_type = ?, trigger_column = ?,
          trigger_value = ?, recipient_columns = ?, cc_enabled = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(
        template_id || existing.template_id,
        recipe_type || existing.recipe_type,
        trigger_column || existing.trigger_column,
        trigger_value || existing.trigger_value,
        JSON.stringify(recipient_columns || []),
        cc_enabled ? 1 : 0,
        integrationId
      )
      .run()

    const integration = await env.DB.prepare(
      'SELECT * FROM integrations WHERE id = ?'
    )
      .bind(integrationId)
      .first() as Integration

    return successResponse({ integration }, 'Integration updated successfully')
  }

  // DELETE /integrations/:id
  if (path.startsWith('/integrations/') && request.method === 'DELETE') {
    const integrationId = parseInt(path.split('/').pop()!)

    const existing = await env.DB.prepare(
      'SELECT * FROM integrations WHERE id = ?'
    )
      .bind(integrationId)
      .first()

    if (!existing) {
      return errorResponse(new NotFoundError('Integration not found'), 404)
    }

    // Delete webhooks
    const webhooks = await env.DB.prepare(
      'SELECT webhook_id FROM webhooks WHERE integration_id = ?'
    )
      .bind(integrationId)
      .all()

    for (const webhook of webhooks.results) {
      await deleteMondayWebhook(env, webhook.webhook_id)
    }

    await env.DB.prepare('DELETE FROM integrations WHERE id = ?')
      .bind(integrationId)
      .run()

    return successResponse(
      { success: true },
      'Integration deleted successfully'
    )
  }

  return errorResponse(new Error('Not found'), 404)
}

async function createMondayWebhook(
  env: Env,
  boardId: string,
  integrationId: number
): Promise<string | null> {
  try {
    const webhookUrl = `${env.MONDAY_WEBHOOK_URL || 'https://your-worker.workers.dev'}/webhook`

    const mutation = `
      mutation {
        create_webhook(
          board_id: ${boardId}
          url: "${webhookUrl}"
          event: change_column_value
          config: "{\\"columnIds\\": [\\"all\\"]}"
        ) {
          id
          board_id
        }
      }
    `

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MONDAY_API_KEY}`
      },
      body: JSON.stringify({ query: mutation })
    })

    const data = await response.json()
    return data.data?.create_webhook?.id || null
  } catch (error) {
    console.error('Error creating webhook:', error)
    return null
  }
}

async function deleteMondayWebhook(env: Env, webhookId: string): Promise<void> {
  try {
    const mutation = `
      mutation {
        delete_webhook(webhook_id: ${webhookId}) {
          id
        }
      }
    `

    await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MONDAY_API_KEY}`
      },
      body: JSON.stringify({ query: mutation })
    })
  } catch (error) {
    console.error('Error deleting webhook:', error)
  }
}
