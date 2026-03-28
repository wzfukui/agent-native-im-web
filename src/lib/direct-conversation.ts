import type { TFunction } from 'i18next'
import * as api from '@/lib/api'
import { buildDirectConversationTitle } from '@/lib/conversation-title'
import type { Conversation, Entity } from '@/lib/types'

function conversationPublicIdOf(conversation: { public_id?: string; metadata?: Record<string, unknown> } | null | undefined): string {
  if (!conversation) return ''
  if (typeof conversation.public_id === 'string' && conversation.public_id) return conversation.public_id
  const meta = conversation.metadata as Record<string, unknown> | undefined
  if (typeof meta?.public_id === 'string' && meta.public_id) return meta.public_id
  return ''
}

export function conversationRouteFor(conversation: { id: number; public_id?: string; metadata?: Record<string, unknown> } | null | undefined): string {
  const publicId = conversationPublicIdOf(conversation)
  if (publicId) return `/chat/public/${encodeURIComponent(publicId)}`
  return conversation ? `/chat/${conversation.id}` : '/chat'
}

export function shouldReuseDirectConversation(target: Entity): boolean {
  return target.entity_type === 'user'
}

export function findExistingDirectConversation(conversations: Conversation[], myEntityId: number, targetEntityId: number): Conversation | undefined {
  return conversations
    .filter((conversation) => {
    if (conversation.conv_type !== 'direct') return false
    const participantIds = new Set((conversation.participants || []).map((participant) => participant.entity_id))
    return participantIds.has(myEntityId) && participantIds.has(targetEntityId) && participantIds.size === 2
  })
    .sort((a, b) => Date.parse(b.updated_at || '') - Date.parse(a.updated_at || ''))[0]
}

export async function openOrCreateDirectConversation(options: {
  token: string
  t: TFunction
  myEntity: Entity
  target: Entity
  conversations: Conversation[]
  addConversation: (conversation: Conversation) => void
  mode?: 'smart' | 'existing' | 'new'
}): Promise<Conversation | null> {
  const { token, t, myEntity, target, conversations, addConversation, mode = 'smart' } = options
  const existing = findExistingDirectConversation(conversations, myEntity.id, target.id)
  const shouldReuse =
    mode === 'existing' || (mode === 'smart' && shouldReuseDirectConversation(target))

  if (existing && shouldReuse) return existing

  const res = await api.createConversation(token, {
    title: buildDirectConversationTitle(t, target),
    conv_type: 'direct',
    participant_ids: [target.id],
  })
  if (!res.ok || !res.data) return null
  addConversation(res.data)
  return res.data
}
