import type {
  APIResponse, LoginResponse, Entity, Conversation,
  MessagesResponse, SearchResponse, Message, AdminStats,
} from './types'

let baseUrl = ''

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '')
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function request<T>(method: string, path: string, token?: string, body?: unknown): Promise<APIResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

// Auth
export const login = (username: string, password: string) =>
  request<LoginResponse>('POST', '/api/v1/auth/login', undefined, { username, password })

export const register = (username: string, password: string, email?: string, displayName?: string) =>
  request<{ token: string; entity: Entity }>('POST', '/api/v1/auth/register', undefined, { username, password, email, display_name: displayName })

export const getMe = (token: string) =>
  request<Entity>('GET', '/api/v1/me', token)

export const refreshToken = (token: string) =>
  request<{ token: string }>('POST', '/api/v1/auth/refresh', token)

// Conversations
export const listConversations = (token: string) =>
  request<Conversation[]>('GET', '/api/v1/conversations', token)

export const getConversation = (token: string, id: number) =>
  request<Conversation>('GET', `/api/v1/conversations/${id}`, token)

export const createConversation = (token: string, data: { title: string; conv_type?: string; participant_ids?: number[] }) =>
  request<Conversation>('POST', '/api/v1/conversations', token, data)

export const updateConversation = (token: string, id: number, title: string) =>
  request<Conversation>('PUT', `/api/v1/conversations/${id}`, token, { title })

// Participants
export const addParticipant = (token: string, convId: number, entityId: number, role?: string) =>
  request('POST', `/api/v1/conversations/${convId}/participants`, token, { entity_id: entityId, role })

export const removeParticipant = (token: string, convId: number, entityId: number) =>
  request('DELETE', `/api/v1/conversations/${convId}/participants/${entityId}`, token)

export const updateSubscription = (token: string, convId: number, mode: string, contextWindow?: number) =>
  request('PUT', `/api/v1/conversations/${convId}/subscription`, token, {
    mode,
    ...(contextWindow !== undefined && { context_window: contextWindow }),
  })

export const markAsRead = (token: string, convId: number, messageId: number) =>
  request('POST', `/api/v1/conversations/${convId}/read`, token, { message_id: messageId })

// Messages
export const listMessages = (token: string, convId: number, before?: number, limit = 30) => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', String(before))
  return request<MessagesResponse>('GET', `/api/v1/conversations/${convId}/messages?${params}`, token)
}

export const sendMessage = (token: string, msg: {
  conversation_id: number
  content_type?: string
  layers: Record<string, unknown>
  attachments?: unknown[]
  mentions?: number[]
  reply_to?: number
}) => request<Message>('POST', '/api/v1/messages/send', token, msg)

export const revokeMessage = (token: string, msgId: number) =>
  request('DELETE', `/api/v1/messages/${msgId}`, token)

export const searchMessages = (token: string, convId: number, query: string, limit = 20) =>
  request<SearchResponse>('GET', `/api/v1/conversations/${convId}/search?q=${encodeURIComponent(query)}&limit=${limit}`, token)

// Entities
export const listEntities = (token: string) =>
  request<Entity[]>('GET', '/api/v1/entities', token)

export const createEntity = (token: string, name: string) =>
  request<{ entity: Entity; bootstrap_key: string; markdown_doc: string }>('POST', '/api/v1/entities', token, { name })

export const deleteEntity = (token: string, id: number) =>
  request('DELETE', `/api/v1/entities/${id}`, token)

export const approveConnection = (token: string, id: number) =>
  request('POST', `/api/v1/entities/${id}/approve`, token)

export const updateEntity = (token: string, id: number, data: { display_name?: string; metadata?: Record<string, unknown> }) =>
  request<Entity>('PUT', `/api/v1/entities/${id}`, token, data)

export const getEntityStatus = (token: string, id: number) =>
  request<{ online: boolean; last_seen?: string }>('GET', `/api/v1/entities/${id}/status`, token)

export const batchPresence = (token: string, entityIds: number[]) =>
  request<{ presence: Record<string, boolean> }>('POST', '/api/v1/presence/batch', token, { entity_ids: entityIds })

export const updateProfile = (token: string, data: { display_name?: string; avatar_url?: string }) =>
  request<Entity>('PUT', '/api/v1/me', token, data)

// Admin
export const createUser = (token: string, username: string, password: string) =>
  request<Entity>('POST', '/api/v1/admin/users', token, { username, password })

export const adminListUsers = (token: string, limit = 50, offset = 0) =>
  request<{ entities: (Entity & { online: boolean })[]; total: number }>('GET', `/api/v1/admin/users?limit=${limit}&offset=${offset}`, token)

export const adminUpdateUser = (token: string, id: number, data: { display_name?: string; status?: string }) =>
  request<Entity>('PUT', `/api/v1/admin/users/${id}`, token, data)

export const adminDeleteUser = (token: string, id: number) =>
  request('DELETE', `/api/v1/admin/users/${id}`, token)

export const adminGetStats = (token: string) =>
  request<AdminStats>('GET', '/api/v1/admin/stats', token)

export const adminListConversations = (token: string, limit = 50, offset = 0) =>
  request<{ conversations: Conversation[]; total: number }>('GET', `/api/v1/admin/conversations?limit=${limit}&offset=${offset}`, token)

// Files
export async function uploadFile(token: string, file: File): Promise<APIResponse<{ url: string }>> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${baseUrl}/api/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  return res.json()
}

// Push notifications
export const getVapidKey = () =>
  request<{ public_key: string }>('GET', '/api/v1/push/vapid-key')

export const registerPush = (token: string, data: { endpoint: string; key_p256dh: string; key_auth: string }) =>
  request('POST', '/api/v1/push/subscribe', token, data)

export const unregisterPush = (token: string, endpoint: string) =>
  request('POST', '/api/v1/push/unsubscribe', token, { endpoint })

// Updates (long polling fallback)
export const getUpdates = (token: string, since?: string) =>
  request<{ events: unknown[] }>('GET', `/api/v1/updates${since ? `?since=${since}` : ''}`, token)
