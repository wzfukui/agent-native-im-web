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
  token: localStorage.getItem('aim_token'),
  entity: (() => {
    try { return JSON.parse(localStorage.getItem('aim_entity') || 'null') } catch { return null }
  })(),
  setAuth: (token, entity) => {
    localStorage.setItem('aim_token', token)
    localStorage.setItem('aim_entity', JSON.stringify(entity))
    set({ token, entity })
  },
  setToken: (token) => {
    localStorage.setItem('aim_token', token)
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('aim_token')
    localStorage.removeItem('aim_entity')
    set({ token: null, entity: null })
  },
}))
