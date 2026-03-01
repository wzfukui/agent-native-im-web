import { create } from 'zustand'
import type { Conversation } from '@/lib/types'

interface ConversationsState {
  conversations: Conversation[]
  activeId: number | null
  setConversations: (convs: Conversation[]) => void
  setActive: (id: number | null) => void
  updateConversation: (id: number, partial: Partial<Conversation>) => void
  addConversation: (conv: Conversation) => void
}

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  activeId: null,
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
}))
