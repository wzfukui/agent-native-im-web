const COOKIE_SESSION_TOKEN = '__cookie_session__'
const OFFLINE_CACHED_TOKEN = '__offline_cached__'

export function isCookieSessionToken(token: string | null | undefined): boolean {
  return token === COOKIE_SESSION_TOKEN
}

export function isOfflineCachedToken(token: string | null | undefined): boolean {
  return token === OFFLINE_CACHED_TOKEN
}

export function isSyntheticSessionToken(token: string | null | undefined): boolean {
  return isCookieSessionToken(token) || isOfflineCachedToken(token)
}

export function getCookieSessionToken(): string {
  return COOKIE_SESSION_TOKEN
}

export function getOfflineCachedToken(): string {
  return OFFLINE_CACHED_TOKEN
}
