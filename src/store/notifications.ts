import { create } from 'zustand'

interface NotificationState {
  unreadCount: number
  dirtyVersion: number
  setUnreadCount: (count: number) => void
  bumpUnreadCount: (delta?: number) => void
  markReadCount: (delta?: number) => void
  resetUnreadCount: () => void
  markDirty: () => void
}

export const useNotificationsStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  dirtyVersion: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  bumpUnreadCount: (delta = 1) => set((state) => ({ unreadCount: Math.max(0, state.unreadCount + delta) })),
  markReadCount: (delta = 1) => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - delta) })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
  markDirty: () => set((state) => ({ dirtyVersion: state.dirtyVersion + 1 })),
}))
