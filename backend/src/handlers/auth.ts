import type { Env } from '../utils/types'
import { corsResponse, errorResponse, successResponse } from '../utils/response'
import { ValidationError, NotFoundError } from '../utils/errors'

export async function handleAuth(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const path = url.pathname

  // GET /auth/status?board_id=xxx
  if (path === '/auth/status') {
    const boardId = url.searchParams.get('board_id')
    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    const board = await env.DB.prepare(
      'SELECT * FROM boards WHERE board_id = ?'
    )
      .bind(boardId)
      .first()

    if (!board) {
      return successResponse({ authenticated: false })
    }

    return successResponse({
      authenticated: true,
      provider: board.email_provider
    })
  }

  // GET /auth/google?board_id=xxx
  if (path === '/auth/google') {
    const boardId = url.searchParams.get('board_id')
    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    const clientId = env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return errorResponse(new Error('Google OAuth not configured'), 500)
    }

    const redirectUri = `${url.origin}/auth/google/callback`
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.send')
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${boardId}&access_type=offline&prompt=consent`

    return successResponse({ auth_url: authUrl })
  }

  // GET /auth/google/callback
  if (path === '/auth/google/callback') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // board_id
    const error = url.searchParams.get('error')

    if (error) {
      return new Response(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (!code || !state) {
      return errorResponse(new ValidationError('Invalid callback parameters'), 400)
    }

    try {
      // Exchange code for tokens
      const redirectUri = `${url.origin}/auth/google/callback`
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      })

      const tokens = await tokenResponse.json()

      // Save to database
      await env.DB.prepare(`
        INSERT OR REPLACE INTO boards (board_id, email_provider, access_token, refresh_token, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(state, 'gmail', tokens.access_token, tokens.refresh_token).run()

      return new Response(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #00c875;">✓ Authentication Successful!</h1>
            <p>Your Google account has been connected.</p>
            <p>You can close this window and return to Monday.com.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    } catch (error: any) {
      console.error('Google auth error:', error)
      return new Response(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #df2f4a;">✗ Authentication Failed</h1>
            <p>Could not complete authentication. Please try again.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }
  }

  // GET /auth/microsoft?board_id=xxx
  if (path === '/auth/microsoft') {
    const boardId = url.searchParams.get('board_id')
    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    const clientId = env.MICROSOFT_CLIENT_ID
    if (!clientId) {
      return errorResponse(new Error('Microsoft OAuth not configured'), 500)
    }

    const redirectUri = encodeURIComponent(`${url.origin}/auth/microsoft/callback`)
    const scope = encodeURIComponent('https://graph.microsoft.com/Mail.Send')
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${boardId}&response_mode=query`

    return successResponse({ auth_url: authUrl })
  }

  // GET /auth/microsoft/callback
  if (path === '/auth/microsoft/callback') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // board_id
    const error = url.searchParams.get('error')

    if (error) {
      return new Response(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (!code || !state) {
      return errorResponse(new ValidationError('Invalid callback parameters'), 400)
    }

    try {
      // Exchange code for tokens
      const redirectUri = `${url.origin}/auth/microsoft/callback`
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.MICROSOFT_CLIENT_ID!,
          client_secret: env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      })

      const tokens = await tokenResponse.json()

      // Save to database
      await env.DB.prepare(`
        INSERT OR REPLACE INTO boards (board_id, email_provider, access_token, refresh_token, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(state, 'outlook', tokens.access_token, tokens.refresh_token).run()

      return new Response(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #00c875;">✓ Authentication Successful!</h1>
            <p>Your Microsoft account has been connected.</p>
            <p>You can close this window and return to Monday.com.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    } catch (error: any) {
      console.error('Microsoft auth error:', error)
      return new Response(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #df2f4a;">✗ Authentication Failed</h1>
            <p>Could not complete authentication. Please try again.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }
  }

  // POST /auth/remove?board_id=xxx
  if (path === '/auth/remove' && request.method === 'POST') {
    const boardId = url.searchParams.get('board_id')
    if (!boardId) {
      return errorResponse(new ValidationError('board_id is required'), 400)
    }

    await env.DB.prepare('DELETE FROM boards WHERE board_id = ?')
      .bind(boardId)
      .run()

    return successResponse({ success: true })
  }

  return errorResponse(new Error('Not found'), 404)
}
