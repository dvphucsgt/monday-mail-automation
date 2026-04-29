export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

export function errorResponse(error: Error | any, status = 500): Response {
  const message = error.message || 'Internal server error'
  return jsonResponse(
    {
      error: message,
      code: error.code || 'INTERNAL_ERROR'
    },
    status
  )
}

export function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

export function successResponse(data: any, message = 'Success'): Response {
  return jsonResponse({
    success: true,
    message,
    data
  })
}
