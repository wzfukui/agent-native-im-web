import type { WSMessage } from './types'

type WSHandler = (msg: WSMessage) => void

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

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  get connected() { return this._connected }

  onMessage(handler: WSHandler) {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  connect() {
    this.intentionalClose = false
    this.doConnect()
  }

  private doConnect() {
    if (this.ws) {
      try { this.ws.close() } catch {}
    }

    const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this._connected = true
      this.reconnectDelay = 1000
      this.handlers.forEach((h) => h({ type: 'entity.online', data: { self: true } } as WSMessage))
    }

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WSMessage
        this.handlers.forEach((h) => h(msg))
      } catch {}
    }

    this.ws.onclose = () => {
      this._connected = false
      this.handlers.forEach((h) => h({ type: 'entity.offline', data: { self: true } } as WSMessage))
      if (!this.intentionalClose) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay)
      this.doConnect()
    }, this.reconnectDelay)
  }

  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }
    this._connected = false
  }

  send(data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  updateToken(newToken: string) {
    this.token = newToken
  }
}
