import React, { useContext, useState, useEffect } from 'react'
import AppContext from '../utils/AppContext'
import mondaySdk from 'monday-sdk-js'
import backendAPI from '../api/backend'
import IntegrationModal from '../components/IntegrationModal'
import './IntegrationPage.css'

export default function IntegrationPage({ context }) {
  const { boardId } = context || {}

  const integrationRecipes = [
    {
      id: 1,
      name: 'Status Change',
      description: 'Gửi email khi giá trị của cột trạng thái thay đổi',
      icon: '🔄'
    },
    {
      id: 2,
      name: 'Date Reached',
      description: 'Gửi email khi đến ngày đáo hạn',
      icon: '📅'
    },
    {
      id: 3,
      name: 'Person Assigned',
      description: 'Gửi email khi item được gán cho người',
      icon: '👤'
    },
    {
      id: 4,
      name: 'Item Created',
      description: 'Gửi email khi item mới được tạo',
      icon: '➕'
    },
    {
      id: 5,
      name: 'Item Updated',
      description: 'Gửi email khi item được cập nhật',
      icon: '✏️'
    },
    {
      id: 6,
      name: 'Button Click',
      description: 'Gửi email khi button được click',
      icon: '🔘'
    }
  ]

  const [integrations, setIntegrations] = useState([])
  const [templates, setTemplates] = useState([])
  const [boardColumns, setBoardColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [editingIntegration, setEditingIntegration] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const contextData = await mondaySdk.get('context')
      const boardId = contextData.data.boardId

      // Fetch integrations
      const integrationsData = await backendAPI.getIntegrations(boardId)
      setIntegrations(integrationsData.integrations)

      // Fetch templates
      const templatesData = await backendAPI.getTemplates(boardId)
      setTemplates(templatesData.templates)

      // Fetch board columns from Monday
      const columnsData = await mondaySdk.api(`query { boards(ids: [${boardId}]) { columns { id title type settings_str } } }`)
      const columns = columnsData.data.boards[0].columns.map(col => ({
        ...col,
        settings_labels: col.settings_str ? JSON.parse(col.settings_str).labels : []
      }))
      setBoardColumns(columns)

      setLoading(false)
    } catch (error) {
      console.error('Failed to load data:', error)
      setLoading(false)
    }
  }

  function handleConfigureRecipe(recipeType) {
    setSelectedRecipe(recipeType)
    setEditingIntegration(null)
    setShowModal(true)
  }

  function handleEditIntegration(integration) {
    setEditingIntegration(integration)
    setSelectedRecipe(integration.recipe_type)
    setShowModal(true)
  }

  async function handleIntegrationSubmit(formData) {
    try {
      const contextData = await mondaySdk.get('context')
      const boardId = contextData.data.boardId

      if (editingIntegration) {
        await backendAPI.updateIntegration(editingIntegration.id, formData)
      } else {
        await backendAPI.createIntegration(boardId, formData)
      }

      await loadData()
      setShowModal(false)
      mondayApi.executeCommand('showNotification', {
        text: editingIntegration ? 'Integration updated' : 'Integration created',
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to save integration:', error)
      mondayApi.executeCommand('showNotification', {
        text: 'Failed to save integration',
        type: 'error'
      })
    }
  }

  async function handleDeleteIntegration(integrationId) {
    if (!confirm('Are you sure you want to delete this integration?')) return

    try {
      await backendAPI.deleteIntegration(integrationId)
      await loadData()
      mondayApi.executeCommand('showNotification', {
        text: 'Integration deleted',
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to delete integration:', error)
    }
  }

  return (
    <div className="page-container integration-page">
      <div className="page-header">
        <h2>⚡ Tích Hợp Tự Động</h2>
        <p>Cấu hình quy trình tự động gửi email</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading integrations...</p>
        </div>
      ) : (
        <div className="integration-recipes">
          {integrationRecipes.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              <div className="recipe-icon">{recipe.icon}</div>
              <div className="recipe-content">
                <h3>{recipe.name}</h3>
                <p>{recipe.description}</p>
              </div>
              <button className="recipe-btn" onClick={() => handleConfigureRecipe(recipe.id === 1 ? 'status_change' : recipe.id === 2 ? 'date_reached' : recipe.id === 3 ? 'person_assigned' : recipe.id === 4 ? 'item_created' : recipe.id === 5 ? 'item_updated' : 'button_click')}>Cấu hình</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <IntegrationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          recipeType={selectedRecipe}
          templates={templates}
          boardColumns={boardColumns}
          integration={editingIntegration}
          onSubmit={handleIntegrationSubmit}
        />
      )}
    </div>
  )
}
