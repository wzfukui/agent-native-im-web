import { create } from 'zustand'
import type { Entity } from '@/lib/types'

interface AuthState {
  token: string | null
  entity: Entity | null
  setAuth: (token: string, entity: Entity) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem('aim_token'),
  entity: (() => {
    try { return JSON.parse(sessionStorage.getItem('aim_entity') || 'null') } catch { return null }
  })(),
  setAuth: (token, entity) => {
    sessionStorage.setItem('aim_token', token)
    sessionStorage.setItem('aim_entity', JSON.stringify(entity))
    set({ token, entity })
  },
  setToken: (token) => {
    sessionStorage.setItem('aim_token', token)
    set({ token })
  },
  logout: () => {
    sessionStorage.removeItem('aim_token')
    sessionStorage.removeItem('aim_entity')
    set({ token: null, entity: null })
  },
}))
