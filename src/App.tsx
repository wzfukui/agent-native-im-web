import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { useTasksStore } from '@/store/tasks'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Sidebar } from '@/components/layout/Sidebar'
import { ConversationList } from '@/components/conversation/ConversationList'
import { ChatThread } from '@/components/chat/ChatThread'
import { ConversationSettingsPanel } from '@/components/conversation/ConversationSettingsPanel'
import { TaskPanel } from '@/components/task/TaskPanel'
import { UserSettingsPage } from '@/components/settings/UserSettingsPage'
import { BotList } from '@/components/entity/BotList'
import { BotDetail } from '@/components/entity/BotDetail'
import { NewConversationDialog } from '@/components/conversation/NewConversationDialog'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AnimpWebSocket } from '@/lib/ws-client'
import { registerPushNotifications } from '@/lib/push'
import type { WSMessage, Message, Entity, Task, Conversation } from '@/lib/types'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cacheConversations, getCachedConversations } from '@/lib/cache'
import { listOutboxMessages, deleteOutboxMessage } from '@/lib/cache'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ConnectionStatusBar } from '@/components/ui/ConnectionStatusBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorToast, type ErrorToastData } from '@/components/ui/ErrorToast'
import { setGlobalErrorHandler, getErrorMessage, type ParsedError } from '@/lib/errors'
import { setSessionHooks } from '@/lib/auth-session'

export default function App() {
  const { t } = useTranslation()
  const { token, entity, setAuth, setToken, logout } = useAuthStore()
  const { conversations, activeId, setConversations, setActive, addConversation, updateConversation, removeConversation, mutedIds } = useConversationsStore()
  const { addMessage, revokeMessage, updateMessageReactions, startStream, updateStream, endStream } = useMessagesStore()
  const { setOnline, setWsConnected } = usePresenceStore()

  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [viewMode, setViewMode] = useState<'chat' | 'bots' | 'admin' | 'settings'>('chat')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()
  const wsRef = useRef<AnimpWebSocket | null>(null)
  const [wsClient, setWsClient] = useState<AnimpWebSocket | null>(null)
  const lastWSRefreshAttemptRef = useRef(0)
  const flushingOutboxRef = useRef(false)
  const [botEntities, setBotEntities] = useState<Entity[]>([])
  const [typingMap, setTypingMap] = useState<Map<number, Map<number, { name: string; expiresAt: number; isProcessing?: boolean; phase?: string }>>>(new Map())
  const [showSettings, setShowSettings] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [leaveConfirmId, setLeaveConfirmId] = useState<number | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{ entity: Entity; key: string; doc: string } | null>(null)
  const [botListRefresh, setBotListRefresh] = useState(0)
  const [errorToasts, setErrorToasts] = useState<ErrorToastData[]>([])

  // ─── Global error handler ────────────────────────────────────
  const pushError = useCallback((parsed: ParsedError) => {
    const toast: ErrorToastData = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message: parsed.message,
      detail: parsed.detail,
      timestamp: Date.now(),
    }
    setErrorToasts((prev) => [...prev.slice(-4), toast]) // keep max 5
  }, [])

  const dismissError = useCallback((id: string) => {
    setErrorToasts((prev) => prev.filter((e) => e.id !== id))
  }, [])

  useEffect(() => {
    setGlobalErrorHandler(pushError)
  }, [pushError])

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

  // ─── API token refresh hooks ──────────────────────────────────
  useEffect(() => {
    setSessionHooks({
      getToken: () => useAuthStore.getState().token,
      setToken: (nextToken: string) => setToken(nextToken),
      onAuthFailure: () => logout(),
    })
  }, [setToken, logout])

  // ─── Proactive token refresh (avoid expiry-triggered disconnects) ───
  useEffect(() => {
    if (!token || !entity || entity.entity_type !== 'user') return

    const refreshIfNeeded = async () => {
      const exp = decodeJwtExp(useAuthStore.getState().token || '')
      if (!exp) return
      const nowSec = Math.floor(Date.now() / 1000)
      // Refresh when remaining lifetime <= 30 minutes.
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

  // ─── Flush offline outbox when back online ────────────────────
  useEffect(() => {
    if (!token || !entity || entity.entity_type !== 'user') return

    const flushOutbox = async () => {
      if (!navigator.onLine) return
      if (flushingOutboxRef.current) return
      flushingOutboxRef.current = true
      const queued = await listOutboxMessages()
      try {
        if (queued.length === 0) return

        const optimistic = useMessagesStore.getState()
        for (const item of queued) {
          if (!item.id) continue
          const res = await api.sendMessage(token, {
            conversation_id: item.conversation_id,
            content_type: item.content_type || 'text',
            layers: {
              summary: item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text,
              data: { body: item.text },
            },
            mentions: item.mentions,
            reply_to: item.reply_to,
          })
          if (res.ok && res.data) {
            optimistic.replaceOptimisticMessage(item.temp_id, res.data)
            await deleteOutboxMessage(item.id)
          } else {
            // Stop on first failure to avoid busy-looping while server is unavailable.
            break
          }
        }
      } finally {
        flushingOutboxRef.current = false
      }
    }

    void flushOutbox()
    const onOnline = () => { void flushOutbox() }
    const timer = setInterval(() => { void flushOutbox() }, 15000)
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [token, entity])

  // ─── Load bot entities for BotDetail ──────────────────────────
  const loadBotEntities = useCallback(async () => {
    if (!token) return
    const res = await api.listEntities(token)
    if (res.ok && res.data) setBotEntities(Array.isArray(res.data) ? res.data : [])
  }, [token])

  useEffect(() => {
    if (token && viewMode === 'bots') loadBotEntities()
  }, [token, viewMode])

  // ─── Login ─────────────────────────────────────────────────────
  const handleLogin = async (username: string, password: string) => {
    setLoginError('')
    try {
      const res = await api.login(username, password)
      if (res.ok && res.data) {
        setAuth(res.data.token, res.data.entity)
      } else {
        setLoginError(getErrorMessage(res) || t('auth.loginError'))
      }
    } catch {
      setLoginError(t('auth.networkError'))
    }
  }

  // ─── Register ────────────────────────────────────────────────────
  const handleRegister = (token: string, entity: Entity) => {
    setShowRegister(false)
    setAuth(token, entity)
  }

  // ─── Load cached conversations on start ─────────────────────
  useEffect(() => {
    if (!token) return
    getCachedConversations().then((cached) => {
      if (cached.length > 0) setConversations(cached)
    })
  }, [token])

  // ─── Load conversations ────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!token) return
    const res = await api.listConversations(token)
    if (res.ok && res.data) {
      const convs = Array.isArray(res.data) ? res.data : []
      setConversations(convs)
      cacheConversations(convs)

      // Load initial presence for all participants
      const entityIds = new Set<number>()
      for (const conv of convs) {
        for (const p of conv.participants || []) {
          if (p.entity_id !== entity?.id) entityIds.add(p.entity_id)
        }
      }
      if (entityIds.size > 0) {
        const presRes = await api.batchPresence(token, Array.from(entityIds))
        if (presRes.ok && presRes.data?.presence) {
          for (const [idStr, isOnline] of Object.entries(presRes.data.presence)) {
            setOnline(Number(idStr), isOnline as boolean)
          }
        }
      }
    }
  }, [token, entity?.id])

  useEffect(() => {
    if (token) loadConversations()
  }, [token])

  // ─── Push notifications ─────────────────────────────────────
  useEffect(() => {
    if (token) registerPushNotifications(token)
  }, [token])

  // ─── Admin detection ───────────────────────────────────────
  useEffect(() => {
    if (!token) { setIsAdmin(false); return }
    api.adminGetStats(token).then((res) => setIsAdmin(res.ok === true))
  }, [token])

  // ─── Title badge for unread count ────────────────────────────
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => {
      if (mutedIds.has(c.id)) return sum
      return sum + (c.unread_count || 0)
    }, 0)
  }, [conversations, mutedIds])

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Agent-Native IM` : 'Agent-Native IM'
  }, [totalUnread])

  // ─── WebSocket connection ──────────────────────────────────────
  useEffect(() => {
    if (!token || !entity) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.host
    const wsUrl = `${wsProtocol}//${wsHost}/api/v1/ws`

    const ws = new AnimpWebSocket(wsUrl, token)
    wsRef.current = ws
    setWsClient(ws)

    const unsub = ws.onMessage((msg: WSMessage) => {
      switch (msg.type) {
        case 'entity.online': {
          const onData = msg.data as { self?: boolean; entity_id?: number }
          if (onData?.self) {
            setWsConnected(true)
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
            // The addMessage function already checks for duplicates by ID
            // Just add the message - if it's already there, it won't be added again
            addMessage(message)

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
            // For delete, we don't know the convId, but the tasks store will handle it
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
          // Subscription config push — currently informational for frontend
          // Could be used to show subscription mode indicators in the UI
          break
        }

        case 'typing': {
          const typData = msg.data as { conversation_id?: number; entity_id?: number; entity_name?: string; is_processing?: boolean; phase?: string }
          if (typData?.conversation_id && typData?.entity_id && typData.entity_id !== entity?.id) {
            setTypingMap((prev) => {
              const next = new Map(prev)
              const convTyping = new Map(next.get(typData.conversation_id!) || [])
              convTyping.set(typData.entity_id!, {
                name: typData.entity_name || `User ${typData.entity_id}`,
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

    // On reconnect, refresh messages for all loaded conversations
    ws.onReconnect(() => {
      const loaded = Object.keys(useMessagesStore.getState().byConv).map(Number)
      for (const convId of loaded) {
        api.listMessages(token, convId).then((res) => {
          if (res.ok && res.data) {
            for (const msg of (res.data.messages || [])) {
              addMessage(msg)
            }
          }
        })
      }
      loadConversations()
    })

    const unsubAuthFailure = ws.onAuthFailure(async () => {
      if (entity.entity_type !== 'user') return
      if (!navigator.onLine) return

      const now = Date.now()
      if (now - lastWSRefreshAttemptRef.current < 15000) return
      lastWSRefreshAttemptRef.current = now

      const currentToken = useAuthStore.getState().token
      if (!currentToken) return
      const exp = decodeJwtExp(currentToken)
      const nowSec = Math.floor(now / 1000)
      // If token is still far from expiry, this is likely transient network/server issue.
      if (exp && exp-nowSec > 300) return

      const res = await api.refreshToken(currentToken)
      if (res.ok && res.data?.token) {
        setToken(res.data.token)
      } else if (typeof res.error === 'string' && (
        res.error.toLowerCase().includes('invalid token') ||
        res.error.toLowerCase().includes('missing authorization') ||
        res.error.toLowerCase().includes('disabled') ||
        res.error.toLowerCase().includes('forbidden')
      )) {
        logout()
      }
    })

    ws.connect()

    return () => {
      unsub()
      unsubAuthFailure()
      ws.disconnect()
      wsRef.current = null
      setWsClient(null)
    }
  }, [token, entity, setToken, logout, decodeJwtExp])

  // ─── Typing indicator ─────────────────────────────────────────
  const handleTyping = useCallback((conversationId: number) => {
    wsRef.current?.send({
      type: 'typing',
      data: { conversation_id: conversationId },
    })
  }, [])

  // ─── Cancel stream ────────────────────────────────────────────
  const handleCancelStream = useCallback((streamId: string, conversationId: number) => {
    wsRef.current?.send({
      type: 'task.cancel',
      data: { stream_id: streamId, conversation_id: conversationId },
    })
    endStream(streamId)
  }, [])

  // ─── New chat from bot panel ───────────────────────────────────
  const handleStartChatFromBot = (entityId: number) => {
    setViewMode('chat')
    setNewChatEntityId(entityId)
    setShowNewChat(true)
  }

  // ─── Open conversation from bot detail ────────────────────────
  const handleOpenConversation = (convId: number) => {
    setViewMode('chat')
    setActive(convId)
  }

  // ─── Disable bot (soft delete) ──────────────────────────────
  const handleDisableBot = async (botId: number) => {
    try {
      await api.deleteEntity(token!, botId)
      loadBotEntities()
      setBotListRefresh(prev => prev + 1)
    } catch (error) {
      console.error('Failed to disable bot:', error)
    }
  }

  // ─── Reactivate disabled bot ──────────────────────────────
  const handleReactivateBot = async (botId: number) => {
    try {
      await api.reactivateEntity(token!, botId)
      loadBotEntities()
      setBotListRefresh(prev => prev + 1)
    } catch (error) {
      console.error('Failed to reactivate bot:', error)
    }
  }

  // ─── Hard delete bot (permanent) ──────────────────────────
  const handleHardDeleteBot = async (botId: number) => {
    try {
      await api.deleteEntity(token!, botId)
      setSelectedBotId(null)
      loadBotEntities()
      setBotListRefresh(prev => prev + 1)
    } catch (error) {
      console.error('Failed to delete bot:', error)
    }
  }

  // ─── Leave / Archive conversation ────────────────────────────
  const handleLeaveConversation = useCallback((convId: number) => {
    setLeaveConfirmId(convId)
  }, [])

  const confirmLeave = useCallback(async () => {
    if (!token || !leaveConfirmId) return
    const res = await api.leaveConversation(token, leaveConfirmId)
    if (res.ok) {
      removeConversation(leaveConfirmId)
    }
    setLeaveConfirmId(null)
  }, [token, leaveConfirmId])

  const [archiveRefresh, setArchiveRefresh] = useState(0)

  const handleArchiveConversation = useCallback(async (convId: number) => {
    if (!token) return
    const res = await api.archiveConversation(token, convId)
    if (res.ok) {
      removeConversation(convId)
      setArchiveRefresh((n) => n + 1)
    }
  }, [token])

  const handleUnarchiveConversation = useCallback(async (convId: number) => {
    if (!token) return
    const res = await api.unarchiveConversation(token, convId)
    if (res.ok) {
      setArchiveRefresh((n) => n + 1)
      loadConversations()
    }
  }, [token, loadConversations])

  const handlePinConversation = useCallback(async (convId: number) => {
    if (!token || !entity) return
    const res = await api.pinConversation(token, convId)
    if (res.ok) {
      // Update local participant data with pinned_at
      const conv = conversations.find((c) => c.id === convId)
      if (conv) {
        const updated = { ...conv, participants: conv.participants?.map((p) =>
          p.entity_id === entity.id ? { ...p, pinned_at: new Date().toISOString() } : p
        )}
        updateConversation(convId, updated)
      }
    }
  }, [token, entity, conversations])

  const handleUnpinConversation = useCallback(async (convId: number) => {
    if (!token || !entity) return
    const res = await api.unpinConversation(token, convId)
    if (res.ok) {
      const conv = conversations.find((c) => c.id === convId)
      if (conv) {
        const updated = { ...conv, participants: conv.participants?.map((p) =>
          p.entity_id === entity.id ? { ...p, pinned_at: undefined } : p
        )}
        updateConversation(convId, updated)
      }
    }
  }, [token, entity, conversations])

  // ─── Archived conversation view ─────────────────────────────────
  const [archivedConv, setArchivedConv] = useState<Conversation | null>(null)

  // When activeId changes, check if it's in the main list or needs to be fetched as archived
  useEffect(() => {
    if (!activeId || !token) { setArchivedConv(null); return }
    const inMain = conversations.find((c) => c.id === activeId)
    if (inMain) { setArchivedConv(null); return }
    // Not in main list — fetch it (likely archived)
    api.getConversation(token, activeId).then((res) => {
      if (res.ok && res.data) setArchivedConv(res.data)
      else setArchivedConv(null)
    })
  }, [activeId, conversations, token])

  // ─── Active conversation ───────────────────────────────────────
  const activeConv = conversations.find((c) => c.id === activeId) || archivedConv
  const isArchivedView = activeConv === archivedConv && archivedConv !== null

  // ─── Not logged in ─────────────────────────────────────────────
  if (showRegister) {
    return <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setShowRegister(false)} />
  }

  if (!token || !entity) {
    return <LoginForm onLogin={handleLogin} error={loginError} onSwitchToRegister={() => setShowRegister(true)} />
  }

  // ─── Selected bot entity ────────────────────────────────────────
  const selectedBot = botEntities.find((e) => e.id === selectedBotId) || null

  // ─── Main layout ───────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <ConnectionStatusBar ws={wsClient} />
      <div className="flex-1 flex min-h-0">
      {/* Icon sidebar */}
      <Sidebar
        botMode={viewMode === 'bots'}
        adminMode={viewMode === 'admin'}
        settingsMode={viewMode === 'settings'}
        isAdmin={isAdmin}
        onToggleBots={() => setViewMode(viewMode === 'bots' ? 'chat' : 'bots')}
        onToggleAdmin={() => setViewMode(viewMode === 'admin' ? 'chat' : 'admin')}
        onToggleChat={() => setViewMode('chat')}
        onToggleSettings={() => setViewMode(viewMode === 'settings' ? 'chat' : 'settings')}
      />

      {viewMode === 'admin' ? (
        <div className="flex-1 min-w-0">
          <ErrorBoundary>
            <AdminPanel onBack={() => setViewMode('chat')} />
          </ErrorBoundary>
        </div>
      ) : viewMode === 'settings' ? (
        <ErrorBoundary>
          <UserSettingsPage onBack={() => setViewMode('chat')} />
        </ErrorBoundary>
      ) : (
        <>
          {/* Left panel: ConversationList or BotList */}
          <div className={cn(
            'w-72 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0',
            viewMode === 'chat'
              ? (activeId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')
              : (selectedBotId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'),
          )}>
            {viewMode === 'chat' ? (
              <ConversationList
                conversations={conversations}
                activeId={activeId}
                myEntityId={entity.id}
                onSelect={setActive}
                onNewChat={() => { setNewChatEntityId(undefined); setShowNewChat(true) }}
                onUpdateConversation={(id, title) => {
                  // Just update local state, ConversationItem already called the API
                  updateConversation(id, { title })
                }}
                onLeave={handleLeaveConversation}
                onArchive={handleArchiveConversation}
                onUnarchive={handleUnarchiveConversation}
                onPin={handlePinConversation}
                onUnpin={handleUnpinConversation}
                archiveRefresh={archiveRefresh}
              />
            ) : (
              <BotList
                selectedId={selectedBotId}
                onSelect={(id) => { setSelectedBotId(id); loadBotEntities() }}
                onStartChat={handleStartChatFromBot}
                onCreated={(result) => {
                  setCreatedCredentials(result)
                  setSelectedBotId(result.entity.id)
                  loadBotEntities()
                }}
                refreshTrigger={botListRefresh}
              />
            )}
          </div>

          {/* Right panel: ChatThread or BotDetail */}
          <div className="flex-1 min-w-0 flex">
            {viewMode === 'chat' ? (
              activeConv ? (
                <>
                  <div className="flex-1 min-w-0">
                    <ErrorBoundary>
                    <ChatThread
                      key={activeConv.id}
                      conversation={activeConv}
                      onBack={() => setActive(null)}
                      onCancelStream={handleCancelStream}
                      onTyping={handleTyping}
                      typingEntities={typingMap.get(activeConv.id)}
                      onToggleSettings={() => { setShowSettings((prev) => !prev); setShowTasks(false) }}
                      onToggleTasks={() => { setShowTasks((prev) => !prev); setShowSettings(false) }}
                      isArchived={isArchivedView}
                    />
                    </ErrorBoundary>
                  </div>
                  {showSettings && (
                    <ConversationSettingsPanel
                      conversation={activeConv}
                      onClose={() => setShowSettings(false)}
                      onLeave={() => removeConversation(activeConv.id)}
                      isArchived={isArchivedView}
                    />
                  )}
                  {showTasks && (
                    <TaskPanel
                      conversationId={activeConv.id}
                      participants={(activeConv.participants || []).map((p: { entity_id: number; entity?: Entity }) => ({
                        entity_id: p.entity_id,
                        entity: p.entity as { id: number; display_name: string; name: string; entity_type: string } | undefined,
                      }))}
                      onClose={() => setShowTasks(false)}
                      isArchived={isArchivedView}
                    />
                  )}
                </>
              ) : (
                <div className="flex-1 h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-bot)]/10 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-[var(--color-accent)] opacity-40" />
                  </div>
                  {conversations.length === 0 ? (
                    <div className="text-center space-y-4">
                      <p className="text-base font-medium text-[var(--color-text-secondary)]">{t('app.welcomeTitle')}</p>
                      <div className="space-y-3">
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-xs">{t('app.welcomeStep1')}</p>
                          <button
                            onClick={() => setViewMode('bots')}
                            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer"
                          >
                            {t('app.welcomeStep1Action')} →
                          </button>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-xs">{t('app.welcomeStep2')}</p>
                          <button
                            onClick={() => { setNewChatEntityId(undefined); setShowNewChat(true) }}
                            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer"
                          >
                            {t('app.welcomeStep2Action')} →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-base font-medium text-[var(--color-text-secondary)]">Agent-Native IM</p>
                      <p className="text-xs mt-1">{t('app.selectConversation')}</p>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex-1 min-w-0">
                <ErrorBoundary>
                  <BotDetail
                    bot={selectedBot}
                    createdCredentials={selectedBot?.id === createdCredentials?.entity.id ? createdCredentials : null}
                    onDismissCredentials={() => setCreatedCredentials(null)}
                    onBack={() => setSelectedBotId(null)}
                    onOpenConversation={handleOpenConversation}
                    onDisable={handleDisableBot}
                    onReactivate={handleReactivateBot}
                    onHardDelete={handleHardDeleteBot}
                    onStartChat={handleStartChatFromBot}
                    onRefresh={loadBotEntities}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showNewChat && (
        <NewConversationDialog
          preselectedEntityId={newChatEntityId}
          onClose={() => setShowNewChat(false)}
          onCreated={(convId) => {
            setShowNewChat(false)
            loadConversations().then(() => setActive(convId))
          }}
        />
      )}

      <ConfirmDialog
        open={leaveConfirmId !== null}
        title={t('settings.leave')}
        message={t('settings.leaveConfirm')}
        variant="danger"
        confirmLabel={t('settings.leave')}
        onConfirm={confirmLeave}
        onCancel={() => setLeaveConfirmId(null)}
      />

      <ErrorToast errors={errorToasts} onDismiss={dismissError} />
      </div>
    </div>
  )
}
