import { useState } from 'react'
import { Flex, Text, Checkbox } from '@vibe/core'
import { Box } from '@vibe/layout'
import './RecipeConfigForm.css'

export default function RecipeConfigForm({ recipeType, templates, boardColumns, integration, onSubmit, onCancel }) {
  const [templateId, setTemplateId] = useState(integration?.template_id || '')
  const [triggerColumn, setTriggerColumn] = useState(integration?.trigger_column || '')
  const [triggerValue, setTriggerValue] = useState(integration?.trigger_value || '')
  const [recipientColumns, setRecipientColumns] = useState(integration?.recipient_columns ? JSON.parse(integration.recipient_columns) : [])
  const [ccEnabled, setCcEnabled] = useState(integration?.cc_enabled === 1)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      template_id: templateId,
      trigger_column: triggerColumn,
      trigger_value: triggerValue,
      recipient_columns: recipientColumns,
      cc_enabled: ccEnabled
    })
  }

  const needsTriggerColumn = ['status_change', 'date_reached', 'person_assigned', 'button_click'].includes(recipeType)
  const needsTriggerValue = ['status_change'].includes(recipeType)

  return (
    <form id="recipe-config-form" className="recipe-config-form" onSubmit={handleSubmit}>
      {/* Template Selection */}
      <div className="form-section" style={{ animationDelay: '0.05s' }}>
        <div className="field-label">
          <span className="field-icon">📝</span>
          <Text weight="bold">Email Template</Text>
        </div>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="custom-select"
        >
          <option value="">Select a template to send...</option>
          {templates?.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Trigger Column Selection */}
      {needsTriggerColumn && (
        <div className="form-section" style={{ animationDelay: '0.1s' }}>
          <div className="field-label">
            <span className="field-icon">⚡</span>
            <Text weight="bold">Trigger Column</Text>
          </div>
          <select
            value={triggerColumn}
            onChange={(e) => setTriggerColumn(e.target.value)}
            className="custom-select"
          >
            <option value="">Select the column that triggers this...</option>
            {boardColumns?.filter(c => ['status', 'date', 'people', 'button'].includes(c.type)).map(col => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Trigger Value (for status_change) */}
      {needsTriggerValue && triggerColumn && (
        <div className="form-section" style={{ animationDelay: '0.15s' }}>
          <div className="field-label">
            <span className="field-icon">🎯</span>
            <Text weight="bold">Trigger When Status Is</Text>
          </div>
          <select
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
            className="custom-select"
          >
            <option value="">Select the target status...</option>
            {Array.isArray(boardColumns?.find(c => c.id === triggerColumn)?.settings_labels) && 
             boardColumns.find(c => c.id === triggerColumn).settings_labels.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recipient Columns Selection */}
      <div className="form-section" style={{ animationDelay: '0.2s' }}>
        <div className="field-label">
          <span className="field-icon">📧</span>
          <Text weight="bold">Recipient Columns</Text>
        </div>
        <div className="recipient-grid">
          {boardColumns?.filter(c => ['email', 'people'].includes(c.type)).map(col => {
            const isSelected = recipientColumns?.includes(col.id);
            return (
              <div 
                key={col.id} 
                className={`recipient-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  if (isSelected) {
                    setRecipientColumns(recipientColumns.filter(id => id !== col.id))
                  } else {
                    setRecipientColumns([...recipientColumns, col.id])
                  }
                }}
              >
                <Checkbox
                  checked={isSelected}
                  readOnly
                />
                <span className="recipient-label">{col.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CC Enabled */}
      <div className="form-section" style={{ animationDelay: '0.25s' }}>
        <div className="cc-toggle">
          <Checkbox 
            checked={ccEnabled} 
            onChange={(e) => setCcEnabled(e.target.checked)} 
          />
          <div className="cc-text-container">
            <span className="cc-title">CC all recipients</span>
            <span className="cc-desc">All selected recipients will see each other in the email.</span>
          </div>
        </div>
      </div>
    </form>
  )
}

