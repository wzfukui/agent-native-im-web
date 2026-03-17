import { create } from 'zustand'
import type { Entity } from '@/lib/types'

interface AuthState {
  token: string | null
  entity: Entity | null
  /** Whether we've attempted cookie-based session restore on this page load */
  sessionChecked: boolean
  setAuth: (token: string, entity: Entity) => void
  setToken: (token: string) => void
  setSessionChecked: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: sessionStorage.getItem('aim_token'),
  entity: (() => {
    try { return JSON.parse(sessionStorage.getItem('aim_entity') || 'null') } catch { return null }
  })(),
  sessionChecked: false,
  setAuth: (token, entity) => {
    sessionStorage.setItem('aim_token', token)
    sessionStorage.setItem('aim_entity', JSON.stringify(entity))
    set({ token, entity, sessionChecked: true })
  },
  setToken: (token) => {
    sessionStorage.setItem('aim_token', token)
    set({ token })
  },
  setSessionChecked: () => {
    set({ sessionChecked: true })
  },
  logout: () => {
    // Fire-and-forget: tell server to clear the cookie
    const token = get().token
    if (token) {
      import('@/lib/api').then((api) => api.logout(token)).catch(() => {})
    }
    sessionStorage.removeItem('aim_token')
    sessionStorage.removeItem('aim_entity')
    set({ token: null, entity: null })
  },
}))
