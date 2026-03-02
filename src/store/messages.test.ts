import { describe, it, expect, beforeEach } from 'vitest'
import { useMessagesStore } from './messages'
import type { Message } from '@/lib/types'

const makeMsg = (overrides: Partial<Message> = {}): Message => ({
  id: 1,
  conversation_id: 100,
  sender_id: 10,
  content_type: 'text',
  layers: { summary: 'hello' },
  created_at: '2026-03-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  useMessagesStore.setState({ byConv: {}, hasMore: {}, streams: {} })
})

describe('setMessages', () => {
  it('sets messages for a conversation', () => {
    const msgs = [makeMsg({ id: 1 }), makeMsg({ id: 2 })]
    useMessagesStore.getState().setMessages(100, msgs, true)

    const state = useMessagesStore.getState()
    expect(state.byConv[100]).toHaveLength(2)
    expect(state.hasMore[100]).toBe(true)
  })
})

describe('prependMessages', () => {
  it('prepends older messages', () => {
    useMessagesStore.getState().setMessages(100, [makeMsg({ id: 3 })], true)
    useMessagesStore.getState().prependMessages(100, [makeMsg({ id: 1 }), makeMsg({ id: 2 })], false)

    const msgs = useMessagesStore.getState().byConv[100]
    expect(msgs).toHaveLength(3)
    expect(msgs[0].id).toBe(1)
    expect(msgs[2].id).toBe(3)
    expect(useMessagesStore.getState().hasMore[100]).toBe(false)
  })
})

describe('addMessage', () => {
  it('appends a new message', () => {
    useMessagesStore.getState().setMessages(100, [makeMsg({ id: 1 })], false)
    useMessagesStore.getState().addMessage(makeMsg({ id: 2 }))

    expect(useMessagesStore.getState().byConv[100]).toHaveLength(2)
  })

  it('deduplicates by id', () => {
    useMessagesStore.getState().setMessages(100, [makeMsg({ id: 1 })], false)
    useMessagesStore.getState().addMessage(makeMsg({ id: 1 }))

    expect(useMessagesStore.getState().byConv[100]).toHaveLength(1)
  })
})

describe('revokeMessage', () => {
  it('sets revoked_at on the target message', () => {
    useMessagesStore.getState().setMessages(100, [makeMsg({ id: 1 }), makeMsg({ id: 2 })], false)
    useMessagesStore.getState().revokeMessage(100, 1)

    const msgs = useMessagesStore.getState().byConv[100]
    expect(msgs[0].revoked_at).toBeTruthy()
    expect(msgs[1].revoked_at).toBeUndefined()
  })

  it('does not affect other conversations', () => {
    useMessagesStore.getState().setMessages(100, [makeMsg({ id: 1 })], false)
    useMessagesStore.getState().setMessages(200, [makeMsg({ id: 2, conversation_id: 200 })], false)
    useMessagesStore.getState().revokeMessage(100, 1)

    expect(useMessagesStore.getState().byConv[200][0].revoked_at).toBeUndefined()
  })
})

describe('streaming', () => {
  it('startStream creates an active stream', () => {
    useMessagesStore.getState().startStream('s1', 100, 10, { summary: 'thinking...' })

    const stream = useMessagesStore.getState().streams['s1']
    expect(stream).toBeDefined()
    expect(stream.conversation_id).toBe(100)
    expect(stream.sender_id).toBe(10)
    expect(stream.layers.summary).toBe('thinking...')
  })

  it('updateStream merges layers', () => {
    useMessagesStore.getState().startStream('s1', 100, 10, { summary: 'a' })
    useMessagesStore.getState().updateStream('s1', { summary: 'ab' })

    expect(useMessagesStore.getState().streams['s1'].layers.summary).toBe('ab')
  })

  it('updateStream is no-op for unknown stream', () => {
    useMessagesStore.getState().updateStream('unknown', { summary: 'x' })
    expect(useMessagesStore.getState().streams['unknown']).toBeUndefined()
  })

  it('endStream removes stream and appends message', () => {
    useMessagesStore.getState().startStream('s1', 100, 10, { summary: 'streaming' })
    const finalMsg = makeMsg({ id: 99 })
    useMessagesStore.getState().endStream('s1', finalMsg)

    expect(useMessagesStore.getState().streams['s1']).toBeUndefined()
    expect(useMessagesStore.getState().byConv[100]).toHaveLength(1)
    expect(useMessagesStore.getState().byConv[100][0].id).toBe(99)
  })

  it('endStream without message just removes stream', () => {
    useMessagesStore.getState().startStream('s1', 100, 10, { summary: 'cancelled' })
    useMessagesStore.getState().endStream('s1')

    expect(useMessagesStore.getState().streams['s1']).toBeUndefined()
  })

  it('endStream deduplicates message', () => {
    useMessagesStore.getState().setMessages(100, [makeMsg({ id: 99 })], false)
    useMessagesStore.getState().startStream('s1', 100, 10, { summary: 'done' })
    useMessagesStore.getState().endStream('s1', makeMsg({ id: 99 }))

    expect(useMessagesStore.getState().byConv[100]).toHaveLength(1)
  })
})
