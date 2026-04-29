const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'

export const backendAPI = {
  // Auth
  async getAuthStatus(boardId) {
    const response = await fetch(`${API_BASE_URL}/auth/status?board_id=${boardId}`)
    return response.json()
  },

  async removeAuth(boardId) {
    const response = await fetch(`${API_BASE_URL}/auth/remove?board_id=${boardId}`, {
      method: 'POST'
    })
    return response.json()
  },

  // Templates
  async getTemplates(boardId) {
    const response = await fetch(`${API_BASE_URL}/templates?board_id=${boardId}`)
    return response.json()
  },

  async createTemplate(boardId, templateData) {
    const response = await fetch(`${API_BASE_URL}/templates?board_id=${boardId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateData)
    })
    return response.json()
  },

  async updateTemplate(templateId, templateData) {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateData)
    })
    return response.json()
  },

  async deleteTemplate(templateId) {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'DELETE'
    })
    return response.json()
  },

  // Integrations
  async getIntegrations(boardId) {
    const response = await fetch(`${API_BASE_URL}/integrations?board_id=${boardId}`)
    return response.json()
  },

  async createIntegration(boardId, integrationData) {
    const response = await fetch(`${API_BASE_URL}/integrations?board_id=${boardId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationData)
    })
    return response.json()
  },

  async updateIntegration(integrationId, integrationData) {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationData)
    })
    return response.json()
  },

  async deleteIntegration(integrationId) {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}`, {
      method: 'DELETE'
    })
    return response.json()
  },

  // Email Logs
  async getEmailLogs(boardId, limit = 50) {
    const response = await fetch(
      `${API_BASE_URL}/logs?board_id=${boardId}&limit=${limit}`
    )
    return response.json()
  }
}

export default backendAPI
