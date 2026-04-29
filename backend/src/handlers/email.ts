import type { Env, EmailLog } from '../utils/types'
import { errorResponse, successResponse } from '../utils/response'
import { ValidationError, EmailError } from '../utils/errors'

export async function handleEmail(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const path = url.pathname

  // GET /email/logs?board_id=xxx&limit=50
  if (path === '/email/logs' && request.method === 'GET') {
    const boardId = url.searchParams.get('board_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    const logs = await env.DB.prepare(`
      SELECT el.*, t.name as template_name
      FROM email_logs el
      LEFT JOIN templates t ON el.template_id = t.id
      WHERE el.board_id = ?
      ORDER BY el.sent_at DESC
      LIMIT ?
    `)
      .bind(boardId, limit)
      .all()

    return successResponse({ logs: logs.results })
  }

  // POST /email/send
  if (path === '/email/send' && request.method === 'POST') {
    const body = await request.json()
    const { integration_id, item_id, board_id } = body

    if (!integration_id || !item_id || !board_id) {
      return errorResponse(
        new ValidationError('integration_id, item_id, and board_id are required'),
        400
      )
    }

    try {
      const result = await sendEmail(env, integration_id, item_id, board_id)
      return successResponse(result, 'Email sent successfully')
    } catch (error: any) {
      return errorResponse(error, error.statusCode || 500)
    }
  }

  // POST /email/test
  if (path === '/email/test' && request.method === 'POST') {
    const body = await request.json()
    const { board_id, template_id, recipient } = body

    if (!board_id || !template_id || !recipient) {
      return errorResponse(
        new ValidationError('board_id, template_id, and recipient are required'),
        400
      )
    }

    try {
      const template = await env.DB.prepare(
        'SELECT * FROM templates WHERE id = ?'
      )
        .bind(template_id)
        .first() as any

      if (!template) {
        throw new Error('Template not found')
      }

      await sendGmail(env, board_id, recipient, template.subject, template.body, [])
      await sendOutlook(env, board_id, recipient, template.subject, template.body, [])

      return successResponse({ success: true }, 'Test email sent successfully')
    } catch (error: any) {
      return errorResponse(error, 500)
    }
  }

  return errorResponse(new Error('Not found'), 404)
}

async function sendEmail(
  env: Env,
  integrationId: number,
  itemId: string,
  boardId: string
): Promise<any> {
  // Get integration
  const integration = await env.DB.prepare(`
    SELECT i.*, t.subject, t.body, t.attachments
    FROM integrations i
    LEFT JOIN templates t ON i.template_id = t.id
    WHERE i.id = ?
  `)
    .bind(integrationId)
    .first() as any

  if (!integration) {
    throw new Error('Integration not found')
  }

  // Get board config
  const board = await env.DB.prepare(
    'SELECT * FROM boards WHERE board_id = ?'
  )
    .bind(boardId)
    .first() as any

  if (!board) {
    throw new Error('Board not configured')
  }

  // Get item data from Monday
  const itemData = await getMondayItem(env, boardId, itemId)
  const recipients = extractRecipients(itemData, integration.recipient_columns)

  // Prepare email content
  const subject = replaceVariables(integration.subject, itemData)
  const body = replaceVariables(integration.body, itemData)
  const attachments = await prepareAttachments(env, integration.attachments, itemData)

  // Send email
  const results = []
  for (const recipient of recipients) {
    try {
      if (board.email_provider === 'gmail') {
        await sendGmail(env, boardId, recipient, subject, body, attachments)
      } else if (board.email_provider === 'outlook') {
        await sendOutlook(env, boardId, recipient, subject, body, attachments)
      }

      // Log success
      await env.DB.prepare(`
        INSERT INTO email_logs (board_id, item_id, template_id, recipient, status)
        VALUES (?, ?, ?, ?, 'sent')
      `)
        .bind(boardId, itemId, integration.template_id, recipient)
        .run()

      results.push({ recipient, status: 'sent' })
    } catch (error: any) {
      // Log error
      await env.DB.prepare(`
        INSERT INTO email_logs (board_id, item_id, template_id, recipient, status, error)
        VALUES (?, ?, ?, ?, 'failed', ?)
      `)
        .bind(boardId, itemId, integration.template_id, recipient, error.message)
        .run()

      results.push({ recipient, status: 'failed', error: error.message })
    }
  }

  return { results }
}

async function getMondayItem(
  env: Env,
  boardId: string,
  itemId: string
): Promise<any> {
  const query = `
    query {
      boards(ids: [${boardId}]) {
        items(ids: [${itemId}]) {
          id
          name
          column_values {
            id
            text
            value
          }
        }
      }
    }
  `

  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MONDAY_API_KEY}`
    },
    body: JSON.stringify({ query })
  })

  const data = await response.json()
  return data.data?.boards?.[0]?.items?.[0]
}

function extractRecipients(itemData: any, recipientColumns: string): string[] {
  const recipients: string[] = []
  const columns = JSON.parse(recipientColumns)

  for (const columnId of columns) {
    const columnValue = itemData?.column_values?.find((cv: any) => cv.id === columnId)
    if (columnValue?.text) {
      const emails = columnValue.text.split(',').map((e: string) => e.trim())
      recipients.push(...emails)
    }
  }

  return [...new Set(recipients)]
}

function replaceVariables(template: string, itemData: any): string {
  const variables = {
    item_name: itemData?.name || '',
    item_id: itemData?.id || ''
  }

  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value as string)
  }

  return result
}

async function prepareAttachments(
  env: Env,
  attachmentsJson: string,
  itemData: any
): Promise<any[]> {
  const attachments = JSON.parse(attachmentsJson || '[]')
  const result = []

  for (const attachment of attachments) {
    if (attachment.source === 'monday') {
      // Get file from Monday column
      const columnValue = itemData?.column_values?.find(
        (cv: any) => cv.id === attachment.column_id
      )
      if (columnValue?.value) {
        const files = JSON.parse(columnValue.value)
        result.push(...files)
      }
    } else if (attachment.source === 'upload') {
      // Uploaded file
      result.push({
        name: attachment.name,
        url: attachment.url
      })
    }
  }

  return result
}

async function sendGmail(
  env: Env,
  boardId: string,
  recipient: string,
  subject: string,
  body: string,
  attachments: any[]
): Promise<void> {
  const board = await env.DB.prepare(
    'SELECT * FROM boards WHERE board_id = ?'
  )
    .bind(boardId)
    .first() as any

  if (!board) {
    throw new EmailError('Board not configured')
  }

  // Refresh token if needed
  const accessToken = await refreshGmailToken(env, board)

  // Send email using Gmail API
  const email = [
    `To: ${recipient}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ].join('\r\n')

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'message/rfc822'
      },
      body: btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new EmailError(`Failed to send Gmail: ${error}`)
  }
}

async function refreshGmailToken(env: Env, board: any): Promise<string> {
  // Check if token needs refresh
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: board.refresh_token,
      grant_type: 'refresh_token'
    })
  })

  const tokens = await tokenResponse.json()

  // Update access token in database
  await env.DB.prepare(
    'UPDATE boards SET access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE board_id = ?'
  )
    .bind(tokens.access_token, board.board_id)
    .run()

  return tokens.access_token
}

async function sendOutlook(
  env: Env,
  boardId: string,
  recipient: string,
  subject: string,
  body: string,
  attachments: any[]
): Promise<void> {
  const board = await env.DB.prepare(
    'SELECT * FROM boards WHERE board_id = ?'
  )
    .bind(boardId)
    .first() as any

  if (!board) {
    throw new EmailError('Board not configured')
  }

  // Refresh token if needed
  const accessToken = await refreshOutlookToken(env, board)

  // Send email using Microsoft Graph API
  const email = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipient
          }
        }
      ]
    }
  }

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/sendMail',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(email)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new EmailError(`Failed to send Outlook: ${error}`)
  }
}

async function refreshOutlookToken(env: Env, board: any): Promise<string> {
  const tokenResponse = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID!,
        client_secret: env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: board.refresh_token,
        grant_type: 'refresh_token'
      })
    }
  )

  const tokens = await tokenResponse.json()

  await env.DB.prepare(
    'UPDATE boards SET access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE board_id = ?'
  )
    .bind(tokens.access_token, board.board_id)
    .run()

  return tokens.access_token
}
