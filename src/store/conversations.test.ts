import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConversationsStore } from './conversations'
import type { Conversation } from '@/lib/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const makeConv = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 1,
  title: 'Test Conversation',
  type: 'group',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  participants: [],
  ...overrides,
} as Conversation)

beforeEach(() => {
  localStorageMock.clear()
  useConversationsStore.setState({
    conversations: [],
    activeId: null,
    mutedIds: new Set(),
    readReceipts: {},
  })
})

describe('setConversations', () => {
  it('replaces the conversation list', () => {
    const convs = [makeConv({ id: 1 }), makeConv({ id: 2, title: 'Second' })]
    useConversationsStore.getState().setConversations(convs)

    expect(useConversationsStore.getState().conversations).toHaveLength(2)
  })
})

describe('setActive', () => {
  it('sets the active conversation ID', () => {
    useConversationsStore.getState().setActive(42)
    expect(useConversationsStore.getState().activeId).toBe(42)
  })

  it('can clear the active ID', () => {
    useConversationsStore.getState().setActive(42)
    useConversationsStore.getState().setActive(null)
    expect(useConversationsStore.getState().activeId).toBeNull()
  })
})

describe('updateConversation', () => {
  it('merges partial updates into an existing conversation', () => {
    useConversationsStore.getState().setConversations([makeConv({ id: 1, title: 'Old' })])
    useConversationsStore.getState().updateConversation(1, { title: 'New' })

    expect(useConversationsStore.getState().conversations[0].title).toBe('New')
  })

  it('is a no-op when conversation does not exist', () => {
    useConversationsStore.getState().setConversations([makeConv({ id: 1 })])
    useConversationsStore.getState().updateConversation(999, { title: 'Ghost' })

    expect(useConversationsStore.getState().conversations).toHaveLength(1)
    expect(useConversationsStore.getState().conversations[0].title).toBe('Test Conversation')
  })
})

describe('addConversation', () => {
  it('prepends a new conversation', () => {
    useConversationsStore.getState().setConversations([makeConv({ id: 1 })])
    useConversationsStore.getState().addConversation(makeConv({ id: 2, title: 'New' }))

    const convs = useConversationsStore.getState().conversations
    expect(convs).toHaveLength(2)
    expect(convs[0].id).toBe(2)
  })

  it('deduplicates by id (moves existing to top)', () => {
    useConversationsStore.getState().setConversations([
      makeConv({ id: 1, title: 'First' }),
      makeConv({ id: 2, title: 'Second' }),
    ])
    useConversationsStore.getState().addConversation(makeConv({ id: 2, title: 'Updated Second' }))

    const convs = useConversationsStore.getState().conversations
    expect(convs).toHaveLength(2)
    expect(convs[0].id).toBe(2)
    expect(convs[0].title).toBe('Updated Second')
  })
})

describe('removeConversation', () => {
  it('removes a conversation by id', () => {
    useConversationsStore.getState().setConversations([makeConv({ id: 1 }), makeConv({ id: 2 })])
    useConversationsStore.getState().removeConversation(1)

    expect(useConversationsStore.getState().conversations).toHaveLength(1)
    expect(useConversationsStore.getState().conversations[0].id).toBe(2)
  })

  it('clears activeId if removed conversation was active', () => {
    useConversationsStore.getState().setConversations([makeConv({ id: 1 })])
    useConversationsStore.getState().setActive(1)
    useConversationsStore.getState().removeConversation(1)

    expect(useConversationsStore.getState().activeId).toBeNull()
  })

  it('preserves activeId if a different conversation is removed', () => {
    useConversationsStore.getState().setConversations([makeConv({ id: 1 }), makeConv({ id: 2 })])
    useConversationsStore.getState().setActive(1)
    useConversationsStore.getState().removeConversation(2)

    expect(useConversationsStore.getState().activeId).toBe(1)
  })
})

describe('toggleMute', () => {
  it('mutes then unmutes a conversation', () => {
    useConversationsStore.getState().toggleMute(1)
    expect(useConversationsStore.getState().isMuted(1)).toBe(true)

    useConversationsStore.getState().toggleMute(1)
    expect(useConversationsStore.getState().isMuted(1)).toBe(false)
  })

  it('persists muted IDs to localStorage', () => {
    useConversationsStore.getState().toggleMute(5)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'aim_muted_convs',
      expect.stringContaining('5'),
    )
  })
})

describe('readReceipts', () => {
  it('stores a read receipt', () => {
    useConversationsStore.getState().setReadReceipt(100, 10, 50, '2026-03-01T12:00:00Z')

    const receipts = useConversationsStore.getState().readReceipts
    expect(receipts[100]?.[10]).toEqual({
      entityId: 10,
      messageId: 50,
      lastReadAt: '2026-03-01T12:00:00Z',
    })
  })

  it('only updates if newer (higher messageId)', () => {
    const store = useConversationsStore.getState()
    store.setReadReceipt(100, 10, 50, '2026-03-01T12:00:00Z')
    store.setReadReceipt(100, 10, 30, '2026-03-01T11:00:00Z') // older

    const receipt = useConversationsStore.getState().readReceipts[100]?.[10]
    expect(receipt?.messageId).toBe(50) // unchanged
  })

  it('updates when a newer receipt arrives', () => {
    const store = useConversationsStore.getState()
    store.setReadReceipt(100, 10, 50, '2026-03-01T12:00:00Z')
    store.setReadReceipt(100, 10, 75, '2026-03-01T13:00:00Z')

    const receipt = useConversationsStore.getState().readReceipts[100]?.[10]
    expect(receipt?.messageId).toBe(75)
  })

  it('tracks multiple entities per conversation', () => {
    const store = useConversationsStore.getState()
    store.setReadReceipt(100, 10, 50, '2026-03-01T12:00:00Z')
    store.setReadReceipt(100, 20, 45, '2026-03-01T11:30:00Z')

    const receipts = useConversationsStore.getState().readReceipts[100]
    expect(receipts?.[10]?.messageId).toBe(50)
    expect(receipts?.[20]?.messageId).toBe(45)
  })

  it('tracks separate conversations independently', () => {
    const store = useConversationsStore.getState()
    store.setReadReceipt(100, 10, 50, '2026-03-01T12:00:00Z')
    store.setReadReceipt(200, 10, 30, '2026-03-01T11:00:00Z')

    expect(useConversationsStore.getState().readReceipts[100]?.[10]?.messageId).toBe(50)
    expect(useConversationsStore.getState().readReceipts[200]?.[10]?.messageId).toBe(30)
  })
})
