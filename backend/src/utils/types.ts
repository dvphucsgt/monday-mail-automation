export interface Env {
  DB: D1Database
  ENVIRONMENT: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_CLIENT_SECRET?: string
  MONDAY_CLIENT_ID?: string
  MONDAY_CLIENT_SECRET: string
  MONDAY_SIGNING_SECRET: string
  ENCRYPTION_KEY: string
}

export interface Board {
  board_id: string
  account_id: string
  email_provider: string
  access_token: string
  refresh_token: string
  created_at: string
  updated_at: string
}

export interface Template {
  id: number
  board_id: string
  name: string
  subject: string
  body: string
  attachments: string
  created_at: string
  updated_at?: string
}

export interface Integration {
  id: number
  board_id: string
  template_id: number
  recipe_type: string
  trigger_column?: string
  trigger_value?: string
  recipient_columns: string
  cc_enabled: number
  created_at: string
  updated_at?: string
}

export interface EmailLog {
  id: number
  board_id: string
  item_id: string
  template_id: number
  recipient: string
  status: string
  error?: string
  sent_at: string
}

export interface Webhook {
  id: number
  board_id: string
  webhook_id: string
  integration_id: number
  created_at: string
}

export interface MondayContext {
  boardId: string
  accountId: string
  userId?: string
}

export interface MondayWebhookEvent {
  event: {
    type: string
    triggerTime: string
    userId: string
    boardId: string
    groupId: string
    itemId: string
    columnId?: string
    value?: any
    previousValue?: any
  }
}

export enum RecipeType {
  STATUS_CHANGE = 'status_change',
  DATE_REACHED = 'date_reached',
  PERSON_ASSIGNED = 'person_assigned',
  ITEM_CREATED = 'item_created',
  ITEM_UPDATED = 'item_updated',
  BUTTON_CLICK = 'button_click'
}
