import type { Env } from './utils/types'
import { corsResponse, errorResponse, jsonResponse } from './utils/response'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse()
    }

    try {
      // Auth routes
      if (path.startsWith('/auth/')) {
        const { handleAuth } = await import('./handlers/auth')
        return handleAuth(request, env, url)
      }

      // Template routes
      if (path.startsWith('/templates')) {
        const { handleTemplates } = await import('./handlers/templates')
        return handleTemplates(request, env, url)
      }

      // Integration routes
      if (path.startsWith('/integrations')) {
        const { handleIntegrations } = await import('./handlers/integrations')
        return handleIntegrations(request, env, url)
      }

      // Email routes
      if (path.startsWith('/email/')) {
        const { handleEmail } = await import('./handlers/email')
        return handleEmail(request, env, url)
      }

      // Webhook route
      if (path === '/webhook') {
        const { handleWebhook } = await import('./handlers/webhook')
        return handleWebhook(request, env)
      }

      // Health check
      if (path === '/health') {
        return jsonResponse({
          status: 'ok',
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString()
        })
      }

      // 404
      return errorResponse(new Error('Not found'), 404)
    } catch (error: any) {
      console.error('Error handling request:', error)
      return errorResponse(error, error.statusCode || 500)
    }
  }
}

// Export for testing
export { handleAuth } from './handlers/auth'
export { handleTemplates } from './handlers/templates'
export { handleIntegrations } from './handlers/integrations'
export { handleEmail } from './handlers/email'
export { handleWebhook } from './handlers/webhook'
