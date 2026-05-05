import type { Env } from '../utils/types'
import { errorResponse, successResponse } from '../utils/response'
import { NotFoundError } from '../utils/errors'

export async function handleBoards(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const path = url.pathname

  // GET /boards/:boardId/columns
  if (path.endsWith('/columns') && request.method === 'GET') {
    const parts = path.split('/')
    const boardId = parts[parts.length - 2]

    if (!boardId || !env.MONDAY_API_KEY) {
      return errorResponse(new Error('Board ID and API key required'), 400)
    }

    try {
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.MONDAY_API_KEY
        },
        body: JSON.stringify({
          query: `query { boards(ids: [${boardId}]) { columns { id title type } } }`
        })
      })

      const result = await response.json()
      const columns = result?.data?.boards?.[0]?.columns || []

      return successResponse({ columns })
    } catch {
      return errorResponse(new Error('Failed to fetch board columns'), 500)
    }
  }

  // GET /boards/:boardId
  if (path.startsWith('/boards/') && request.method === 'GET') {
    const boardId = path.split('/').pop()!

    const board = await env.DB.prepare(
      'SELECT * FROM boards WHERE board_id = ?'
    )
      .bind(boardId)
      .first()

    if (!board) {
      return errorResponse(new NotFoundError('Board not found'), 404)
    }

    return successResponse({ board })
  }

  return errorResponse(new Error('Not found'), 404)
}
