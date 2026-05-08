import { useState } from 'react'
import { Flex, Text, Label, Select, Checkbox, Box } from '@vibe/core'

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
    <form onSubmit={handleSubmit}>
      {/* Template Selection */}
      <Box marginBottom="16px">
        <Label>Email Template</Label>
        <Select value={templateId} onChange={setTemplateId} fullWidth>
          <option value="">Select template</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </Box>

      {/* Trigger Column Selection */}
      {needsTriggerColumn && (
        <Box marginBottom="16px">
          <Label>Trigger Column</Label>
          <Select value={triggerColumn} onChange={setTriggerColumn} fullWidth>
            <option value="">Select column</option>
            {boardColumns.filter(c => ['status', 'date', 'people', 'button'].includes(c.type)).map(col => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </Select>
        </Box>
      )}

      {/* Trigger Value (for status_change) */}
      {needsTriggerValue && triggerColumn && (
        <Box marginBottom="16px">
          <Label>Trigger When Status Is</Label>
          <Select value={triggerValue} onChange={setTriggerValue} fullWidth>
            <option value="">Select status</option>
            {boardColumns.find(c => c.id === triggerColumn)?.settings_labels?.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </Select>
        </Box>
      )}

      {/* Recipient Columns Selection */}
      <Box marginBottom="16px">
        <Label>Recipient Columns</Label>
        {boardColumns.filter(c => ['email', 'people'].includes(c.type)).map(col => (
          <Flex key={col.id} alignItems="center" marginBottom="8px">
            <Checkbox
              checked={recipientColumns.includes(col.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setRecipientColumns([...recipientColumns, col.id])
                } else {
                  setRecipientColumns(recipientColumns.filter(id => id !== col.id))
                }
              }}
            />
            <Text marginLeft="8px">{col.title}</Text>
          </Flex>
        ))}
      </Box>

      {/* CC Enabled */}
      <Box marginBottom="16px">
        <Checkbox checked={ccEnabled} onChange={(e) => setCcEnabled(e.target.checked)} />
        <Text marginLeft="8px">CC all recipients</Text>
      </Box>
    </form>
  )
}
