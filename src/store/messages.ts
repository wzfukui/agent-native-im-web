import { create } from 'zustand'
import type { Message, ActiveStream, MessageLayers } from '@/lib/types'

interface MessagesState {
  // convId -> messages (newest last)
  byConv: Record<number, Message[]>
  hasMore: Record<number, boolean>
  // active streams (transient)
  streams: Record<string, ActiveStream>

  setMessages: (convId: number, msgs: Message[], hasMore: boolean) => void
  prependMessages: (convId: number, msgs: Message[], hasMore: boolean) => void
  addMessage: (msg: Message) => void
  revokeMessage: (convId: number, msgId: number) => void

  // streaming
  startStream: (streamId: string, convId: number, senderId: number, layers: MessageLayers) => void
  updateStream: (streamId: string, layers: MessageLayers) => void
  endStream: (streamId: string, message?: Message) => void
}

export const useMessagesStore = create<MessagesState>((set) => ({
  byConv: {},
  hasMore: {},
  streams: {},

  setMessages: (convId, msgs, hasMore) =>
    set((s) => ({
      byConv: { ...s.byConv, [convId]: msgs },
      hasMore: { ...s.hasMore, [convId]: hasMore },
    })),

  prependMessages: (convId, msgs, hasMore) =>
    set((s) => ({
      byConv: { ...s.byConv, [convId]: [...msgs, ...(s.byConv[convId] || [])] },
      hasMore: { ...s.hasMore, [convId]: hasMore },
    })),

  addMessage: (msg) =>
    set((s) => {
      const existing = s.byConv[msg.conversation_id] || []
      if (existing.some((m) => m.id === msg.id)) return s
      return {
        byConv: { ...s.byConv, [msg.conversation_id]: [...existing, msg] },
      }
    }),

  revokeMessage: (convId, msgId) =>
    set((s) => ({
      byConv: {
        ...s.byConv,
        [convId]: (s.byConv[convId] || []).map((m) =>
          m.id === msgId ? { ...m, revoked_at: new Date().toISOString() } : m
        ),
      },
    })),

  startStream: (streamId, convId, senderId, layers) =>
    set((s) => ({
      streams: {
        ...s.streams,
        [streamId]: { stream_id: streamId, conversation_id: convId, sender_id: senderId, layers, started_at: Date.now() },
      },
    })),

  updateStream: (streamId, layers) =>
    set((s) => {
      const existing = s.streams[streamId]
      if (!existing) return s
      return {
        streams: {
          ...s.streams,
          [streamId]: { ...existing, layers: { ...existing.layers, ...layers } },
        },
      }
    }),

  endStream: (streamId, message) =>
    set((s) => {
      const { [streamId]: _, ...rest } = s.streams
      if (!message) return { streams: rest }
      const existing = s.byConv[message.conversation_id] || []
      if (existing.some((m) => m.id === message.id)) return { streams: rest }
      return {
        streams: rest,
        byConv: { ...s.byConv, [message.conversation_id]: [...existing, message] },
      }
    }),
}))
