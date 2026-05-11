const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'

const getHeaders = (token = '') => {
  const headers = {
    'ngrok-skip-browser-warning': '69420',
    'Content-Type': 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

export const backendAPI = {
  // Auth
  async getAuthStatus(boardId, token) {
    const response = await fetch(`${API_BASE_URL}/auth/status?board_id=${boardId}`, {
      headers: getHeaders(token)
    })
    return response.json()
  },

  async removeAuth(boardId, token) {
    const response = await fetch(`${API_BASE_URL}/auth/remove?board_id=${boardId}`, {
      method: 'POST',
      headers: getHeaders(token)
    })
    return response.json()
  },

  // Templates
  async getTemplates(boardId, token) {
    const response = await fetch(`${API_BASE_URL}/templates?board_id=${boardId}`, {
      headers: getHeaders(token)
    })
    return response.json()
  },

  async createTemplate(boardId, templateData, token) {
    const response = await fetch(`${API_BASE_URL}/templates?board_id=${boardId}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(templateData)
    })
    return response.json()
  },

  async updateTemplate(templateId, templateData, token) {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(templateData)
    })
    return response.json()
  },

  async deleteTemplate(templateId, token) {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    })
    return response.json()
  },

  // Integrations
  async getIntegrations(boardId, token) {
    const response = await fetch(`${API_BASE_URL}/integrations?board_id=${boardId}`, {
      headers: getHeaders(token)
    })
    return response.json()
  },

  async createIntegration(boardId, integrationData, token) {
    const response = await fetch(`${API_BASE_URL}/integrations?board_id=${boardId}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(integrationData)
    })
    return response.json()
  },

  async updateIntegration(integrationId, integrationData, token) {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(integrationData)
    })
    return response.json()
  },

  async deleteIntegration(integrationId, token) {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    })
    return response.json()
  },

  // Email Logs
  async getEmailLogs(boardId, token, limit = 50) {
    const response = await fetch(
      `${API_BASE_URL}/logs?board_id=${boardId}&limit=${limit}`, {
      headers: getHeaders(token)
    }
    )
    return response.json()
  }
}

export default backendAPI
