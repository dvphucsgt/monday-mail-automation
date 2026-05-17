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
  },

  // Stats API
  async getOverviewStats(boardId, token, days = 7) {
    const response = await fetch(
      `${API_BASE_URL}/stats/overview?board_id=${boardId}&days=${days}`, {
      headers: getHeaders(token)
    }
    )
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to fetch overview stats')
    return data
  },

  async getTrendStats(boardId, token, days = 7) {
    const response = await fetch(
      `${API_BASE_URL}/stats/trend?board_id=${boardId}&days=${days}`, {
      headers: getHeaders(token)
    }
    )
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to fetch trend stats')
    return data
  },

  async getTemplateStats(boardId, token) {
    const response = await fetch(
      `${API_BASE_URL}/stats/templates?board_id=${boardId}`, {
      headers: getHeaders(token)
    }
    )
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to fetch template stats')
    return data
  },

  async getRecipientStats(boardId, token, limit = 10) {
    const response = await fetch(
      `${API_BASE_URL}/stats/recipients?board_id=${boardId}&limit=${limit}`, {
      headers: getHeaders(token)
    }
    )
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to fetch recipient stats')
    return data
  }
}

export default backendAPI

export const getOverviewStats = (boardId, token, days) => backendAPI.getOverviewStats(boardId, token, days)
export const getTrendStats = (boardId, token, days) => backendAPI.getTrendStats(boardId, token, days)
export const getTemplateStats = (boardId, token) => backendAPI.getTemplateStats(boardId, token)
export const getRecipientStats = (boardId, token, limit) => backendAPI.getRecipientStats(boardId, token, limit)
