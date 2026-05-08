import { Modal } from '@vibe/core'
import RecipeConfigForm from './RecipeConfigForm'

const Button = ({ children, kind = 'primary', size = 'medium', onClick, style = {}, ...props }) => {
  const baseStyle = {
    padding: size === 'small' ? '4px' : '0.75rem',
    borderRadius: '4px',
    border: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
    fontSize: size === 'small' ? '0.875rem' : '0.95rem',
    ...style
  }

  const kindStyles = {
    primary: {
      backgroundColor: '#0073ea',
      color: 'white'
    },
    secondary: {
      backgroundColor: '#e0e0e0',
      color: '#323338'
    },
    tertiary: {
      backgroundColor: '#f5f6f7',
      color: '#323338'
    }
  }

  return (
    <button
      style={{ ...baseStyle, ...kindStyles[kind] || kindStyles.primary }}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default function IntegrationModal({ isOpen, onClose, recipeType, templates, boardColumns, integration, onSubmit }) {
  const handleSubmit = (formData) => {
    onSubmit({ ...formData, recipe_type: recipeType })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <ModalHeader title={getRecipeTitle(recipeType)} />
      <ModalContent>
        <RecipeConfigForm
          recipeType={recipeType}
          templates={templates}
          boardColumns={boardColumns}
          integration={integration}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </ModalContent>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>Cancel</Button>
        <Button kind="primary" type="submit">Save</Button>
      </ModalFooter>
    </Modal>
  )
}

function getRecipeTitle(type) {
  const titles = {
    status_change: 'Configure Status Change',
    date_reached: 'Configure Date Reached',
    person_assigned: 'Configure Person Assigned',
    item_created: 'Configure Item Created',
    item_updated: 'Configure Item Updated',
    button_click: 'Configure Button Click'
  }
  return titles[type] || 'Configure Integration'
}
