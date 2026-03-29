import { describe, expect, it } from 'vitest'
import { findExistingDirectConversation, conversationRouteFor, shouldReuseDirectConversation } from './direct-conversation'
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
    expect(conversationRouteFor(conversations[1])).toBe('/chat/direct/conv-public')
  })

  it('routes group conversations into the groups workspace', () => {
    expect(conversationRouteFor({
      id: 7,
      conv_type: 'group',
      title: 'Launch',
      description: '',
      prompt: '',
      metadata: {},
      created_at: '',
      updated_at: '',
    })).toBe('/chat/groups/7')
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

  it('reuses user directs but not bot directs in smart mode', () => {
    expect(shouldReuseDirectConversation({
      id: 1,
      entity_type: 'user',
      name: 'alice',
      display_name: 'Alice',
      status: 'active',
      metadata: {},
      created_at: '',
      updated_at: '',
    })).toBe(true)

    expect(shouldReuseDirectConversation({
      id: 2,
      entity_type: 'bot',
      name: 'helper',
      display_name: 'Helper',
      status: 'active',
      metadata: {},
      created_at: '',
      updated_at: '',
    })).toBe(false)
  })
})
