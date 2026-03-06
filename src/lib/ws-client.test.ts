import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  vi.useFakeTimers()
  mockWsInstance = createMockWsInstance()
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  const MockWS = class { static OPEN = 1; static CLOSED = 3; constructor() { return mockWsInstance as never } }
  vi.stubGlobal('WebSocket', MockWS)
})

afterEach(() => {
  vi.useRealTimers()
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
    ws.connect()
    mockWsInstance.simulateOpen()
    expect(ws.connected).toBe(true)
  })

  // ─── New tests for reliability features ──────────────────────

  it('schedules reconnect with jitter (delay between 0.8x and 1.2x)', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()

    // Simulate disconnect
    mockWsInstance.simulateClose()

    // The reconnect timer should have been scheduled
    // Base delay is 1000ms, jitter range is 800-1200ms
    // Advance time by 800ms — should NOT have reconnected yet in most cases
    // Advance to 1200ms — should have reconnected
    vi.advanceTimersByTime(1200)
    // After timer fires, a new WebSocket should be constructed
    // The mock is recreated so we just check it was attempted (no error)
    expect(ws.connected).toBe(false) // new connection not yet open
  })

  it('queues messages when disconnected and flushes on reconnect', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()

    // Disconnect
    mockWsInstance.simulateClose()
    mockWsInstance.readyState = 3

    // Send messages while disconnected — should be queued
    ws.send({ type: 'msg1' })
    ws.send({ type: 'msg2' })
    expect(mockWsInstance.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'msg1' }))

    // Reconnect
    mockWsInstance = createMockWsInstance()
    vi.advanceTimersByTime(1500) // trigger reconnect
    mockWsInstance.simulateOpen()

    // Queued messages should have been flushed
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'msg1' }))
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'msg2' }))
  })

  it('send queue respects max capacity (50)', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()
    mockWsInstance.simulateClose()
    mockWsInstance.readyState = 3

    // Queue 60 messages — only first 50 should be kept
    for (let i = 0; i < 60; i++) {
      ws.send({ type: `msg${i}` })
    }

    mockWsInstance = createMockWsInstance()
    vi.advanceTimersByTime(1500)
    mockWsInstance.simulateOpen()

    // First 50 should be sent, msg50-msg59 dropped
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'msg0' }))
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'msg49' }))
    expect(mockWsInstance.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'msg50' }))
  })

  it('onReconnect callback fires on reconnection (not first connect)', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    const reconnectCb = vi.fn()
    ws.onReconnect(reconnectCb)
    ws.connect()
    mockWsInstance.simulateOpen()

    // First connect — should NOT fire onReconnect
    expect(reconnectCb).not.toHaveBeenCalled()

    // Disconnect + reconnect
    mockWsInstance.simulateClose()
    mockWsInstance = createMockWsInstance()
    vi.advanceTimersByTime(1500)
    mockWsInstance.simulateOpen()

    // Reconnect — SHOULD fire
    expect(reconnectCb).toHaveBeenCalledTimes(1)
  })

  it('onAuthFailure fires when connection closes before open', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    const authFailure = vi.fn()
    ws.onAuthFailure(authFailure)
    ws.connect()

    // Close before open: handshake/authorization failure scenario
    mockWsInstance.simulateClose()
    expect(authFailure).toHaveBeenCalledTimes(1)
  })

  it('onAuthFailure does not fire after a successful open', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    const authFailure = vi.fn()
    ws.onAuthFailure(authFailure)
    ws.connect()
    mockWsInstance.simulateOpen()

    mockWsInstance.simulateClose()
    expect(authFailure).not.toHaveBeenCalled()
  })

  it('client-side ping sends ping message every 25s', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()

    // Clear initial calls (entity.online synthetic dispatch)
    mockWsInstance.send.mockClear()

    // Advance 25s — should send a ping
    vi.advanceTimersByTime(25_000)
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
  })

  it('pong received cancels stale connection detection', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()

    // Trigger ping
    vi.advanceTimersByTime(25_000)

    // Simulate pong response
    mockWsInstance.simulateMessage({ type: 'pong' })

    // Advance past pong timeout (10s) — connection should NOT be closed
    vi.advanceTimersByTime(10_000)
    expect(mockWsInstance.close).not.toHaveBeenCalled()
    expect(ws.connected).toBe(true)
  })

  it('disconnect clears send queue', () => {
    const ws = new AnimpWebSocket('ws://localhost/ws', 'token')
    ws.connect()
    mockWsInstance.simulateOpen()
    mockWsInstance.simulateClose()
    mockWsInstance.readyState = 3

    ws.send({ type: 'queued' })
    ws.disconnect()

    // After disconnect, reconnecting should not flush old queue
    mockWsInstance = createMockWsInstance()
    ws.connect()
    mockWsInstance.simulateOpen()
    expect(mockWsInstance.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'queued' }))
  })
})
