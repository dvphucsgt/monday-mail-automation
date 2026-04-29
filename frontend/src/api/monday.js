import { monday } from 'monday-sdk-js'

const mondaySDK = monday()

export const queries = {
  getBoardInfo: (boardId) => `
    query {
      boards(ids: [${boardId}]) {
        id
        name
        columns {
          id
          title
          type
          settings
        }
        groups {
          id
          title
        }
      }
    }
  `,

  getItems: (boardId, limit = 100) => `
    query {
      boards(ids: [${boardId}]) {
        items_page(limit: ${limit}) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `,

  createItem: (boardId, itemName, groupId, columnValues) => `
    mutation {
      create_item(
        board_id: ${boardId}
        group_id: "${groupId}"
        item_name: "${itemName}"
        column_values: "${columnValues}"
      ) {
        id
      }
    }
  `,

  updateColumnValue: (boardId, itemId, columnId, value) => `
    mutation {
      change_column_value(
        board_id: ${boardId}
        item_id: ${itemId}
        column_id: "${columnId}"
        value: "${value}"
      ) {
        id
      }
    }
  `,

  createWebhook: (boardId, webhookUrl) => `
    mutation {
      create_webhook(
        board_id: ${boardId}
        url: "${webhookUrl}"
        event: change_column_value
        config: "{\\"columnIds\\": [\\"all\\"]}"
      ) {
        id
        board_id
      }
    }
  `,

  deleteWebhook: (webhookId) => `
    mutation {
      delete_webhook(webhook_id: ${webhookId}) {
        id
      }
    }
  `
}

export const executeQuery = async (query) => {
  try {
    const response = await mondaySDK.api(query)
    return response.data
  } catch (error) {
    console.error('Monday API Error:', error)
    throw error
  }
}

export const getBoardInfo = async (boardId) => {
  return executeQuery(queries.getBoardInfo(boardId))
}

export const getItems = async (boardId, limit = 100) => {
  return executeQuery(queries.getItems(boardId, limit))
}

export const createItem = async (boardId, itemName, groupId, columnValues) => {
  return executeQuery(queries.createItem(boardId, itemName, groupId, columnValues))
}

export const updateColumnValue = async (boardId, itemId, columnId, value) => {
  return executeQuery(queries.updateColumnValue(boardId, itemId, columnId, value))
}

export const createWebhook = async (boardId, webhookUrl) => {
  return executeQuery(queries.createWebhook(boardId, webhookUrl))
}

export const deleteWebhook = async (webhookId) => {
  return executeQuery(queries.deleteWebhook(webhookId))
}

export default mondaySDK
