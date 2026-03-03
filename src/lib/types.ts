// ─── Entity (User / Bot / Service) ───────────────────────────────
export type EntityType = 'user' | 'bot' | 'service'
export type EntityStatus = 'active' | 'pending' | 'disabled'

export interface Entity {
  id: number
  entity_type: EntityType
  name: string
  display_name: string
  status: EntityStatus
  avatar_url?: string
  metadata: Record<string, unknown>
  owner_id?: number
  created_at: string
  updated_at: string
}

// ─── Conversation ────────────────────────────────────────────────
export type ConvType = 'direct' | 'group' | 'channel'
export type ParticipantRole = 'owner' | 'admin' | 'member' | 'observer'
export type SubscriptionMode = 'mention_only' | 'subscribe_all' | 'mention_with_context' | 'subscribe_digest'

export interface Participant {
  id: number
  conversation_id: number
  entity_id: number
  role: ParticipantRole
  subscription_mode: SubscriptionMode
  context_window?: number
  joined_at: string
  entity?: Entity
}

export interface Conversation {
  id: number
  conv_type: ConvType
  title: string
  description: string
  prompt: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  participants?: Participant[]
  last_message?: Message
  unread_count?: number
}

// ─── Message (5-layer model) ─────────────────────────────────────
export type ContentType = 'text' | 'markdown' | 'code' | 'image' | 'audio' | 'file' | 'artifact' | 'system'

export interface MessageLayers {
  summary?: string
  thinking?: string
  status?: StreamStatus
  data?: Record<string, unknown>
  interaction?: InteractionLayer
}

export interface StreamStatus {
  phase: string
  progress: number
  text: string
}

export interface InteractionLayer {
  type: 'choice' | 'confirm' | 'form'
  prompt?: string
  options?: InteractionOption[]
}

export interface InteractionOption {
  label: string
  value: string
  description?: string
}

export interface Attachment {
  type: string
  url?: string
  filename?: string
  mime_type?: string
  size?: number
  duration?: number
  content?: string
}

export interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender_type?: string
  sender?: Entity
  stream_id?: string
  content_type: ContentType
  layers: MessageLayers
  attachments?: Attachment[]
  mentions?: number[]
  reply_to?: number
  revoked_at?: string
  created_at: string
}

// ─── WebSocket Events ────────────────────────────────────────────
export type WSEventType =
  | 'message.new'
  | 'message.revoked'
  | 'message.updated'
  | 'message.interaction_response'
  | 'conversation.updated'
  | 'conversation.memory_updated'
  | 'conversation.change_request'
  | 'conversation.change_approved'
  | 'conversation.change_rejected'
  | 'task.updated'
  | 'stream_start'
  | 'stream_delta'
  | 'stream_end'
  | 'connection.approved'
  | 'entity.online'
  | 'entity.offline'
  | 'entity.status_update'
  | 'typing'
  | 'pong'

export interface WSMessage {
  type: WSEventType
  data?: unknown
  // stream events
  stream_id?: string
  conversation_id?: number
  sender_id?: number
  layers?: MessageLayers
  // for stream_end, includes full message
  message?: Message
}

// ─── API Responses ───────────────────────────────────────────────
export interface APIResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface LoginResponse {
  entity: Entity
  token: string
}

export interface MessagesResponse {
  messages: Message[]
  has_more: boolean
}

export interface SearchResponse {
  messages: Message[]
  query: string
}

// ─── Admin ──────────────────────────────────────────────────────
export interface AdminStats {
  user_count: number
  bot_count: number
  conversation_count: number
  message_count: number
  ws_connections: number
}

// ─── Task ────────────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  conversation_id: number
  title: string
  description: string
  assignee_id?: number
  assignee?: Entity
  creator?: Entity
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  parent_task_id?: number
  sort_order: number
  created_by: number
  created_at: string
  updated_at: string
  completed_at?: string
}

// ─── Conversation Memory ─────────────────────────────────────────
export interface ConversationMemory {
  id: number
  conversation_id: number
  key: string
  content: string
  updated_by: number
  created_at: string
  updated_at: string
}

// ─── Change Request ──────────────────────────────────────────────
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ChangeRequest {
  id: number
  conversation_id: number
  field: string
  old_value?: string
  new_value: string
  requester_id: number
  requester?: Entity
  status: ChangeRequestStatus
  approver_id?: number
  created_at: string
  resolved_at?: string
}

// ─── Active Stream (transient, in-memory only) ──────────────────
export interface ActiveStream {
  stream_id: string
  conversation_id: number
  sender_id: number
  layers: MessageLayers
  started_at: number
}
