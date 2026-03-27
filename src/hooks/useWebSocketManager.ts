import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { useTasksStore } from '@/store/tasks'
import { AnimpWebSocket } from '@/lib/ws-client'
import * as api from '@/lib/api'
import type { WSMessage, Message, Task } from '@/lib/types'
import { getGatewayWebSocketUrl } from '@/lib/gateway'
import { isSyntheticSessionToken } from '@/lib/session-token'

interface TypingEntry {
  name: string
  expiresAt: number
  isProcessing?: boolean
  phase?: string
}

export type TypingMap = Map<number, Map<number, TypingEntry>>

export function useWebSocketManager() {
  const { token, entity, setToken, logout } = useAuthStore()
  const { setConversations, updateConversation, setActive, setReadReceipt } = useConversationsStore()
  const { addMessage, revokeMessage, updateMessageReactions, startStream, updateStream, endStream, setProgress, clearProgressBySender } = useMessagesStore()
  const { setOnline, setWsConnected } = usePresenceStore()

  const wsRef = useRef<AnimpWebSocket | null>(null)
  const [wsClient, setWsClient] = useState<AnimpWebSocket | null>(null)
  const lastWSRefreshAttemptRef = useRef(0)
  const [typingMap, setTypingMap] = useState<TypingMap>(new Map())
  const [authHandshakeIssue, setAuthHandshakeIssue] = useState(false)

  const decodeJwtExp = useCallback((jwtToken: string): number | null => {
    const parts = jwtToken.split('.')
    if (parts.length < 2) return null
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      const payload = JSON.parse(atob(padded))
      return typeof payload.exp === 'number' ? payload.exp : null
    } catch {
      return null
    }
  }, [])

  // ─── Proactive token refresh ───
  useEffect(() => {
    if (!token || !entity || entity.entity_type !== 'user') return

    const refreshIfNeeded = async () => {
      const exp = decodeJwtExp(useAuthStore.getState().token || '')
      if (!exp) return
      const nowSec = Math.floor(Date.now() / 1000)
      if (exp - nowSec <= 1800) {
        const currentToken = useAuthStore.getState().token
        if (!currentToken) return
        const res = await api.refreshToken(currentToken)
        if (res.ok && res.data?.token) {
          setToken(res.data.token)
        } else {
          logout()
        }
      }
    }

    const timer = setInterval(refreshIfNeeded, 5 * 60 * 1000)
    refreshIfNeeded()
    return () => clearInterval(timer)
  }, [token, entity, setToken, logout, decodeJwtExp])

  // ─── WebSocket connection ───
  useEffect(() => {
    if (!token || !entity) return

    const wsUrl = getGatewayWebSocketUrl()

    const ws = new AnimpWebSocket(wsUrl, isSyntheticSessionToken(token) ? '' : token)
    wsRef.current = ws
    queueMicrotask(() => setWsClient(ws))

    const unsub = ws.onMessage((msg: WSMessage) => {
      switch (msg.type) {
        case 'entity.online': {
          const onData = msg.data as { self?: boolean; entity_id?: number }
          if (onData?.self) {
            setWsConnected(true)
            setAuthHandshakeIssue(false)
          } else if (onData?.entity_id) {
            setOnline(onData.entity_id, true)
          }
          break
        }
        case 'entity.offline': {
          const offData = msg.data as { self?: boolean; entity_id?: number }
          if (offData?.self) {
            setWsConnected(false)
          } else if (offData?.entity_id) {
            setOnline(offData.entity_id, false)
          }
          break
        }

        case 'message.new': {
          const message = msg.data as Message
          if (message) {
            addMessage(message)
            clearProgressBySender(message.conversation_id, message.sender_id)

            const currentActiveId = useConversationsStore.getState().activeId
            const isActive = message.conversation_id === currentActiveId
            const isSelf = message.sender_id === entity?.id
            if (!isActive && !isSelf) {
              const conv = useConversationsStore.getState().conversations.find((c) => c.id === message.conversation_id)
              updateConversation(message.conversation_id, {
                last_message: message,
                updated_at: message.created_at,
                unread_count: (conv?.unread_count || 0) + 1,
              })
            } else {
              updateConversation(message.conversation_id, {
                last_message: message,
                updated_at: message.created_at,
              })
            }
          }
          break
        }

        case 'message.revoked': {
          const data = msg.data as { message_id: number; conversation_id: number }
          if (data) revokeMessage(data.conversation_id, data.message_id)
          break
        }

        case 'message.reaction_updated': {
          const data = msg.data as { message_id: number; conversation_id: number; reactions: { emoji: string; count: number; entity_ids: number[] }[] }
          if (data) updateMessageReactions(data.conversation_id, data.message_id, data.reactions)
          break
        }

        case 'message.read': {
          const data = msg.data as { conversation_id?: number; entity_id?: number; message_id?: number; last_read_at?: string }
          if (data?.conversation_id && data?.entity_id && data?.message_id) {
            setReadReceipt(data.conversation_id, data.entity_id, data.message_id, data.last_read_at || new Date().toISOString())
          }
          break
        }

        case 'conversation.updated': {
          const convData = msg.data as {
            conversation_id?: number
            title?: string
            description?: string
            action?: string
            entity_id?: number
          }
          if (convData?.conversation_id) {
            if (
              (convData.action === 'member_removed' || convData.action === 'member_left') &&
              convData.entity_id === entity?.id
            ) {
              const convs = useConversationsStore.getState().conversations.filter(
                (c) => c.id !== convData.conversation_id
              )
              setConversations(convs)
              if (useConversationsStore.getState().activeId === convData.conversation_id) {
                setActive(null)
              }
            } else {
              if (token) {
                api.getConversation(token, convData.conversation_id).then((res) => {
                  if (res.ok && res.data) {
                    updateConversation(convData.conversation_id!, {
                      title: res.data.title,
                      description: res.data.description,
                      participants: res.data.participants,
                    })
                  }
                })
              }
            }
          }
          break
        }

        case 'task.updated': {
          const taskData = msg.data as { action?: string; task?: Task; task_id?: number }
          if (taskData?.task) {
            const store = useTasksStore.getState()
            if (taskData.action === 'created') {
              store.addTask(taskData.task)
            } else if (taskData.action === 'updated') {
              store.updateTask(taskData.task)
            }
          } else if (taskData?.action === 'deleted' && taskData?.task_id) {
            const store = useTasksStore.getState()
            for (const [convId, tasks] of Object.entries(store.byConv)) {
              if (tasks.some((t) => t.id === taskData.task_id)) {
                store.removeTask(Number(convId), taskData.task_id!)
                break
              }
            }
          }
          break
        }

        case 'entity.config': {
          break
        }

        case 'message.progress': {
          const data = msg.data as { conversation_id?: number; sender_id?: number; stream_id?: string; status?: { phase: string; progress: number; text: string } }
          if (data?.conversation_id && data?.sender_id) {
            setProgress(data.conversation_id, {
              conversation_id: data.conversation_id,
              sender_id: data.sender_id,
              stream_id: data.stream_id || '',
              status: data.status || { phase: 'working', progress: 0, text: '' },
              received_at: Date.now(),
            })
          }
          break
        }

        case 'typing': {
          const typData = msg.data as { conversation_id?: number; entity_id?: number; entity_name?: string; is_processing?: boolean; phase?: string }
          if (typData?.conversation_id && typData?.entity_id && typData.entity_id !== entity?.id) {
            setTypingMap((prev) => {
              const next = new Map(prev)
              const convTyping = new Map(next.get(typData.conversation_id!) || [])
              convTyping.set(typData.entity_id!, {
                name: typData.entity_name || 'Someone',
                expiresAt: Date.now() + (typData.is_processing ? 30000 : 4000),
                isProcessing: typData.is_processing,
                phase: typData.phase,
              })
              next.set(typData.conversation_id!, convTyping)
              return next
            })
          }
          break
        }

        case 'stream_start':
          if (msg.stream_id && msg.conversation_id && msg.sender_id) {
            startStream(msg.stream_id, msg.conversation_id, msg.sender_id, msg.layers || {})
          }
          break

        case 'stream_delta':
          if (msg.stream_id && msg.layers) {
            updateStream(msg.stream_id, msg.layers)
          }
          break

        case 'stream_end':
          if (msg.stream_id) {
            endStream(msg.stream_id, msg.message as Message)
          }
          break
      }
    })

    // Keep sinceId in sync so reconnect requests catch-up from backend
    const syncSinceId = () => {
      ws.sinceId = useMessagesStore.getState().latestMessageId
    }
    // Sync periodically and on each message (addMessage updates latestMessageId)
    const sinceIdInterval = setInterval(syncSinceId, 5000)
    syncSinceId()

    // On reconnect, refresh conversation list (catch-up messages arrive via WS since_id)
    ws.onReconnect(() => {
      syncSinceId()
      api.listConversations(token).then((res) => {
        if (res.ok && res.data) {
          const convs = Array.isArray(res.data) ? res.data : []
          setConversations(convs)
        }
      })
    })

    const unsubAuthFailure = ws.onAuthFailure(async () => {
      if (entity.entity_type !== 'user') return
      if (!navigator.onLine) return

      setAuthHandshakeIssue(true)
      const now = Date.now()
      if (now - lastWSRefreshAttemptRef.current < 15000) return
      lastWSRefreshAttemptRef.current = now

      const currentToken = useAuthStore.getState().token
      if (!currentToken) return
      const exp = decodeJwtExp(currentToken)
      const nowSec = Math.floor(now / 1000)
      if (exp && exp - nowSec > 300) return

      const res = await api.refreshToken(currentToken)
      if (res.ok && res.data?.token) {
        setToken(res.data.token)
        setAuthHandshakeIssue(false)
      } else {
        const errMsg = typeof res.error === 'string'
          ? res.error
          : (res.error?.message || '')
        if (errMsg && (
          errMsg.toLowerCase().includes('invalid token') ||
          errMsg.toLowerCase().includes('missing authorization') ||
          errMsg.toLowerCase().includes('disabled') ||
          errMsg.toLowerCase().includes('forbidden')
        )) {
          logout()
        }
      }
    })

    ws.connect()

    return () => {
      unsub()
      unsubAuthFailure()
      clearInterval(sinceIdInterval)
      ws.disconnect()
      wsRef.current = null
      setWsClient(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store actions (addMessage, setOnline, etc.) are stable zustand selectors
  }, [token, entity, setToken, logout, decodeJwtExp])

  // ─── Typing indicator sender ───
  const sendTyping = useCallback((conversationId: number) => {
    wsRef.current?.send({
      type: 'typing',
      data: { conversation_id: conversationId },
    })
  }, [])

  // ─── Cancel stream ───
  const sendCancelStream = useCallback((streamId: string, conversationId: number) => {
    wsRef.current?.send({
      type: 'stream.cancel',
      data: { stream_id: streamId, conversation_id: conversationId },
    })
    endStream(streamId)
  }, [endStream])

  // ─── Stale stream & progress cleanup ───
  useEffect(() => {
    const interval = setInterval(() => {
      useMessagesStore.getState().cleanStaleStreams()
      useMessagesStore.getState().cleanStaleProgress()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  return {
    wsClient,
    typingMap,
    authHandshakeIssue,
    sendTyping,
    sendCancelStream,
  }
}
