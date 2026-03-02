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
export type ParticipantRole = 'owner' | 'admin' | 'member'
export type SubscriptionMode = 'mention_only' | 'subscribe_all'

export interface Participant {
  id: number
  conversation_id: number
  entity_id: number
  role: ParticipantRole
  subscription_mode: SubscriptionMode
  joined_at: string
  entity?: Entity
}

export interface Conversation {
  id: number
  conv_type: ConvType
  title: string
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
  | 'stream_start'
  | 'stream_delta'
  | 'stream_end'
  | 'connection.approved'
  | 'entity.online'
  | 'entity.offline'
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

// ─── Active Stream (transient, in-memory only) ──────────────────
export interface ActiveStream {
  stream_id: string
  conversation_id: number
  sender_id: number
  layers: MessageLayers
  started_at: number
}
