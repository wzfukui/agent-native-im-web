import { create } from 'zustand'
import type { Conversation } from '@/lib/types'

// Load muted IDs from localStorage
function loadMutedIds(): Set<number> {
  try {
    const raw = localStorage.getItem('aim_muted_convs')
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveMutedIds(ids: Set<number>) {
  localStorage.setItem('aim_muted_convs', JSON.stringify([...ids]))
}

interface ConversationsState {
  conversations: Conversation[]
  activeId: number | null
  mutedIds: Set<number>
  setConversations: (convs: Conversation[]) => void
  setActive: (id: number | null) => void
  updateConversation: (id: number, partial: Partial<Conversation>) => void
  addConversation: (conv: Conversation) => void
  removeConversation: (id: number) => void
  toggleMute: (id: number) => void
  isMuted: (id: number) => boolean
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  activeId: null,
  mutedIds: loadMutedIds(),
  setConversations: (conversations) => set({ conversations }),
  setActive: (activeId) => set({ activeId }),
  updateConversation: (id, partial) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...partial } : c
      ),
    })),
  addConversation: (conv) =>
    set((s) => ({
      conversations: [conv, ...s.conversations.filter((c) => c.id !== conv.id)],
    })),
  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    })),
  toggleMute: (id) => {
    set((s) => {
      const next = new Set(s.mutedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveMutedIds(next)
      return { mutedIds: next }
    })
  },
  isMuted: (id) => get().mutedIds.has(id),
}))
