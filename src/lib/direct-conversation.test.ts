import { describe, expect, it } from 'vitest'
import { findExistingDirectConversation, conversationRouteFor } from './direct-conversation'
import type { Conversation } from './types'

describe('direct-conversation helpers', () => {
  it('finds an existing direct conversation between exactly two participants', () => {
    const conversations = [
      {
        id: 1,
        conv_type: 'group',
        title: 'Group',
        description: '',
        prompt: '',
        metadata: {},
        created_at: '',
        updated_at: '',
        participants: [{ id: 1, conversation_id: 1, entity_id: 1, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' }, { id: 2, conversation_id: 1, entity_id: 2, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' }],
      },
      {
        id: 2,
        public_id: 'conv-public',
        conv_type: 'direct',
        title: 'Direct',
        description: '',
        prompt: '',
        metadata: {},
        created_at: '',
        updated_at: '',
        participants: [{ id: 3, conversation_id: 2, entity_id: 1, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' }, { id: 4, conversation_id: 2, entity_id: 9, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' }],
      },
    ] satisfies Conversation[]

    expect(findExistingDirectConversation(conversations, 1, 9)?.id).toBe(2)
    expect(conversationRouteFor(conversations[1])).toBe('/chat/public/conv-public')
  })

  it('ignores direct conversations with extra participants', () => {
    const conversations = [
      {
        id: 3,
        conv_type: 'direct',
        title: 'Unexpected',
        description: '',
        prompt: '',
        metadata: {},
        created_at: '',
        updated_at: '',
        participants: [
          { id: 1, conversation_id: 3, entity_id: 1, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' },
          { id: 2, conversation_id: 3, entity_id: 9, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' },
          { id: 3, conversation_id: 3, entity_id: 10, role: 'member', subscription_mode: 'subscribe_all', joined_at: '' },
        ],
      },
    ] satisfies Conversation[]

    expect(findExistingDirectConversation(conversations, 1, 9)).toBeUndefined()
  })
})
