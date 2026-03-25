import { setBaseUrl } from './api'

const GATEWAY_KEY = 'aim_gateway_url'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getDefaultGatewayUrl(): string {
  if (typeof window === 'undefined') return 'https://agent-native.im'
  return trimTrailingSlash(window.location.origin)
}

export function normalizeGatewayUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return getDefaultGatewayUrl()
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error('Gateway must use http or https')
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withProtocol)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Gateway must use http or https')
  }
  return trimTrailingSlash(parsed.origin)
}

export function getGatewayUrl(): string {
  if (typeof localStorage === 'undefined') return getDefaultGatewayUrl()
  const saved = localStorage.getItem(GATEWAY_KEY)
  return saved ? trimTrailingSlash(saved) : getDefaultGatewayUrl()
}

export function persistGatewayUrl(input: string): string {
  const normalized = normalizeGatewayUrl(input)
  if (typeof localStorage !== 'undefined') {
    if (normalized === getDefaultGatewayUrl()) {
      localStorage.removeItem(GATEWAY_KEY)
    } else {
      localStorage.setItem(GATEWAY_KEY, normalized)
    }
  }
  applyGatewayUrl(normalized)
  return normalized
}

export function clearGatewayUrl(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(GATEWAY_KEY)
  }
  applyGatewayUrl(getDefaultGatewayUrl())
}

export function applyGatewayUrl(url = getGatewayUrl()): void {
  const currentOrigin = typeof window !== 'undefined' ? trimTrailingSlash(window.location.origin) : ''
  setBaseUrl(trimTrailingSlash(url) === currentOrigin ? '' : trimTrailingSlash(url))
}

export function getGatewayWebSocketUrl(): string {
  const gateway = getGatewayUrl()
  return `${gateway.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://')}/api/v1/ws`
}
