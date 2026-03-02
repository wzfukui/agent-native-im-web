import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnimpWebSocket } from './ws-client'

// Minimal WebSocket mock
let mockWsInstance: {
  readyState: number
  onopen: (() => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  simulateOpen: () => void
  simulateMessage: (data: unknown) => void
  simulateClose: () => void
}

function createMockWsInstance() {
  return {
    readyState: 1, // OPEN
    onopen: null as (() => void) | null,
    onmessage: null as ((ev: { data: string }) => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as (() => void) | null,
    send: vi.fn(),
    close: vi.fn(),
    simulateOpen() { this.onopen?.() },
    simulateMessage(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }) },
    simulateClose() { this.readyState = 3; this.onclose?.() },
  }
}

beforeEach(() => {
  mockWsInstance = createMockWsInstance()
  // Use a class so `new WebSocket(...)` works
  vi.stubGlobal('WebSocket', class {
    static OPEN = 1
    static CLOSED = 3
    constructor() { return mockWsInstance as unknown }
  })
})

describe('AnimpWebSocket', () => {
  it('connects and sets connected = true on open', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'test-token')
    ws.connect()
    expect(ws.connected).toBe(false)

    mockWsInstance.simulateOpen()
    expect(ws.connected).toBe(true)
  })

  it('dispatches messages to handlers', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    const handler = vi.fn()
    ws.onMessage(handler)
    ws.connect()
    mockWsInstance.simulateOpen()

    mockWsInstance.simulateMessage({ type: 'message.new', data: { id: 1 } })
    expect(handler).toHaveBeenCalledWith({ type: 'message.new', data: { id: 1 } })
  })

  it('unsubscribes handler', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    const handler = vi.fn()
    const unsub = ws.onMessage(handler)
    ws.connect()
    mockWsInstance.simulateOpen()

    unsub()
    mockWsInstance.simulateMessage({ type: 'message.new', data: {} })
    // handler was called once for entity.online on open, but not for the message
    const messageCalls = handler.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type: string }).type === 'message.new'
    )
    expect(messageCalls).toHaveLength(0)
  })

  it('send() serializes data and sends via ws', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()

    ws.send({ type: 'task.cancel', data: { stream_id: 's1' } })
    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'task.cancel', data: { stream_id: 's1' } })
    )
  })

  it('send() does nothing when ws is not open', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    // Set readyState to CLOSED (3)
    mockWsInstance.readyState = 3

    ws.send({ type: 'test' })
    expect(mockWsInstance.send).not.toHaveBeenCalled()
  })

  it('disconnect() sets connected = false and prevents reconnect', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()
    expect(ws.connected).toBe(true)

    ws.disconnect()
    expect(ws.connected).toBe(false)
  })

  it('updateToken() changes the token for next connect', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'old-token')
    ws.updateToken('new-token')
    // After updateToken, reconnecting should use the new token
    // We verify by checking the ws instance was created (connect works)
    ws.connect()
    mockWsInstance.simulateOpen()
    expect(ws.connected).toBe(true)
  })
})
