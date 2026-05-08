import { Modal, ModalHeader, ModalContent, ModalFooter } from '@vibe/core'
import Button from '@vibe/core'
import RecipeConfigForm from './RecipeConfigForm'

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
