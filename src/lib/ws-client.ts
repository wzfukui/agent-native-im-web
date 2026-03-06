import type { WSMessage } from './types'

type WSHandler = (msg: WSMessage) => void

const PING_INTERVAL = 25_000 // 25 seconds
const PONG_TIMEOUT = 10_000  // 10 seconds to receive pong
const SEND_QUEUE_MAX = 50

export class AnimpWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private handlers: Set<WSHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private intentionalClose = false
  private _connected = false
  private wasConnected = false // tracks if we ever connected (for reconnect detection)

  // Client-side ping/pong
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private pongTimer: ReturnType<typeof setTimeout> | null = null

  // Send queue for messages sent while disconnected
  private sendQueue: string[] = []

  // Reconnect callback
  private reconnectCallback: (() => void) | null = null

  // Connection change callbacks
  private connectionChangeHandlers: Set<(connected: boolean) => void> = new Set()
  private authFailureHandlers: Set<() => void> = new Set()

  // Network event handlers (stored for cleanup)
  private handleOnline = () => this.onNetworkOnline()
  private handleOffline = () => this.onNetworkOffline()

  private deviceId: string

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
    this.deviceId = this.getOrCreateDeviceId()
  }

  private getOrCreateDeviceId(): string {
    const key = 'aim_device_id'
    const storage = typeof localStorage !== 'undefined' &&
      typeof localStorage.getItem === 'function' &&
      typeof localStorage.setItem === 'function'
      ? localStorage
      : null

    let id = storage?.getItem(key) || null
    if (!id) {
      // crypto.randomUUID() only works in secure contexts (HTTPS/localhost)
      // Fallback to crypto.getRandomValues() which works everywhere
      if (typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID()
      } else {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      }
      storage?.setItem(key, id)
    }
    return id
  }

  get connected() { return this._connected }

  onMessage(handler: WSHandler) {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  /** Register a callback that fires when the connection is restored after a drop. */
  onReconnect(callback: () => void) {
    this.reconnectCallback = callback
  }

  /** Register a callback for connection state changes. */
  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionChangeHandlers.add(handler)
    return () => { this.connectionChangeHandlers.delete(handler) }
  }

  // Fires when a connection attempt fails before WebSocket open.
  // This often indicates an auth failure (e.g. expired JWT during handshake).
  onAuthFailure(handler: () => void) {
    this.authFailureHandlers.add(handler)
    return () => { this.authFailureHandlers.delete(handler) }
  }

  connect() {
    this.intentionalClose = false
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    this.doConnect()
  }

  private doConnect() {
    if (this.ws) {
      try { this.ws.close() } catch {}
    }
    this.stopPing()

    const deviceInfo = (navigator.userAgent || '').substring(0, 100)
    const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}&device_id=${encodeURIComponent(this.deviceId)}&device_info=${encodeURIComponent(deviceInfo)}`
    this.ws = new WebSocket(wsUrl)
    let opened = false

    this.ws.onopen = () => {
      opened = true
      const isReconnect = this.wasConnected
      this._connected = true
      this.wasConnected = true
      this.reconnectDelay = 1000
      this.startPing()
      this.flushQueue()
      this.connectionChangeHandlers.forEach((h) => h(true))
      this.handlers.forEach((h) => h({ type: 'entity.online', data: { self: true } } as WSMessage))
      if (isReconnect && this.reconnectCallback) {
        this.reconnectCallback()
      }
    }

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WSMessage
        if (msg.type === 'pong') {
          this.onPong()
          return
        }
        this.handlers.forEach((h) => h(msg))
      } catch {}
    }

    this.ws.onclose = () => {
      this._connected = false
      this.stopPing()
      this.connectionChangeHandlers.forEach((h) => h(false))
      this.handlers.forEach((h) => h({ type: 'entity.offline', data: { self: true } } as WSMessage))
      if (!opened && !this.intentionalClose) {
        this.authFailureHandlers.forEach((h) => h())
      }
      if (!this.intentionalClose) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  // ─── Ping/Pong ─────────────────────────────────────────────────

  private startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
        // Start pong timeout
        this.pongTimer = setTimeout(() => {
          // No pong received — connection is stale, force close to trigger reconnect
          this.ws?.close()
        }, PONG_TIMEOUT)
      }
    }, PING_INTERVAL)
  }

  private stopPing() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null }
  }

  private onPong() {
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null }
  }

  // ─── Network events ────────────────────────────────────────────

  private onNetworkOnline() {
    if (this.intentionalClose) return
    // Browser came back online — reconnect immediately
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectDelay = 1000
    this.doConnect()
  }

  private onNetworkOffline() {
    // Network lost — stop reconnect timer, we'll reconnect when 'online' fires
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
  }

  // ─── Reconnect with jitter ────────────────────────────────────

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    // Add jitter: delay * (0.8 ~ 1.2)
    const jitter = 0.8 + 0.4 * Math.random()
    const delay = this.reconnectDelay * jitter
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay)
      this.doConnect()
    }, delay)
  }

  // ─── Send with queue ──────────────────────────────────────────

  send(data: unknown) {
    const payload = JSON.stringify(data)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    } else {
      // Queue for later delivery
      if (this.sendQueue.length < SEND_QUEUE_MAX) {
        this.sendQueue.push(payload)
      }
    }
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const queued = this.sendQueue.splice(0)
    for (const payload of queued) {
      this.ws.send(payload)
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  disconnect() {
    this.intentionalClose = true
    this.stopPing()
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
    this._connected = false
    this.sendQueue = []
  }

  updateToken(newToken: string) {
    this.token = newToken
  }
}
