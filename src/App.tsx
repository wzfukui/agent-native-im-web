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
import type { WSMessage, Message, Entity, Task } from '@/lib/types'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cacheConversations, getCachedConversations } from '@/lib/cache'

export default function App() {
  const { t } = useTranslation()
  const { token, entity, setAuth, logout } = useAuthStore()
  const { conversations, activeId, setConversations, setActive, addConversation, updateConversation, removeConversation, mutedIds } = useConversationsStore()
  const { addMessage, revokeMessage, startStream, updateStream, endStream } = useMessagesStore()
  const { setOnline, setWsConnected } = usePresenceStore()

  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [viewMode, setViewMode] = useState<'chat' | 'bots' | 'admin' | 'settings'>('chat')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()
  const wsRef = useRef<AnimpWebSocket | null>(null)
  const [botEntities, setBotEntities] = useState<Entity[]>([])
  const [typingMap, setTypingMap] = useState<Map<number, Map<number, { name: string; expiresAt: number }>>>(new Map())
  const [showSettings, setShowSettings] = useState(false)
  const [showTasks, setShowTasks] = useState(false)

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
        setLoginError(res.error || t('auth.loginError'))
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

        case 'typing': {
          const typData = msg.data as { conversation_id?: number; entity_id?: number; entity_name?: string }
          if (typData?.conversation_id && typData?.entity_id && typData.entity_id !== entity?.id) {
            setTypingMap((prev) => {
              const next = new Map(prev)
              const convTyping = new Map(next.get(typData.conversation_id!) || [])
              convTyping.set(typData.entity_id!, {
                name: typData.entity_name || `User ${typData.entity_id}`,
                expiresAt: Date.now() + 4000,
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

    ws.connect()

    return () => {
      unsub()
      ws.disconnect()
      wsRef.current = null
    }
  }, [token, entity?.id])

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

  // ─── Delete bot from detail ───────────────────────────────────
  const handleDeleteBot = async (botId: number) => {
    await api.deleteEntity(token!, botId)
    setSelectedBotId(null)
    loadBotEntities()
  }

  // ─── Leave / Archive conversation ────────────────────────────
  const handleLeaveConversation = useCallback(async (convId: number) => {
    if (!token) return
    if (!confirm(t('settings.leaveConfirm'))) return
    const res = await api.leaveConversation(token, convId)
    if (res.ok) {
      removeConversation(convId)
    }
  }, [token, t])

  const handleArchiveConversation = useCallback(async (convId: number) => {
    if (!token) return
    const res = await api.archiveConversation(token, convId)
    if (res.ok) {
      removeConversation(convId)
    }
  }, [token])

  // ─── Active conversation ───────────────────────────────────────
  const activeConv = conversations.find((c) => c.id === activeId)

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
    <div className="h-full flex">
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
          <AdminPanel onBack={() => setViewMode('chat')} />
        </div>
      ) : viewMode === 'settings' ? (
        <UserSettingsPage onBack={() => setViewMode('chat')} />
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
                  const tok = useAuthStore.getState().token
                  if (tok) {
                    api.updateConversation(tok, id, { title }).then((res) => {
                      if (res.ok && res.data) {
                        updateConversation(id, { title: res.data.title })
                      }
                    })
                  }
                }}
                onLeave={handleLeaveConversation}
                onArchive={handleArchiveConversation}
              />
            ) : (
              <BotList
                selectedId={selectedBotId}
                onSelect={(id) => { setSelectedBotId(id); loadBotEntities() }}
                onStartChat={handleStartChatFromBot}
              />
            )}
          </div>

          {/* Right panel: ChatThread or BotDetail */}
          <div className="flex-1 min-w-0 flex">
            {viewMode === 'chat' ? (
              activeConv ? (
                <>
                  <div className="flex-1 min-w-0">
                    <ChatThread
                      key={activeConv.id}
                      conversation={activeConv}
                      onBack={() => setActive(null)}
                      onCancelStream={handleCancelStream}
                      onTyping={handleTyping}
                      typingEntities={typingMap.get(activeConv.id)}
                      onToggleSettings={() => { setShowSettings(!showSettings); setShowTasks(false) }}
                      onToggleTasks={() => { setShowTasks(!showTasks); setShowSettings(false) }}
                    />
                  </div>
                  {showSettings && (
                    <ConversationSettingsPanel
                      conversation={activeConv}
                      onClose={() => setShowSettings(false)}
                      onLeave={() => removeConversation(activeConv.id)}
                    />
                  )}
                  {showTasks && (
                    <TaskPanel
                      conversationId={activeConv.id}
                      participants={(activeConv.participants || []).map((p) => ({
                        entity_id: p.entity_id,
                        entity: p.entity as any,
                      }))}
                      onClose={() => setShowTasks(false)}
                    />
                  )}
                </>
              ) : (
                <div className="flex-1 h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-bot)]/10 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-[var(--color-accent)] opacity-40" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-medium text-[var(--color-text-secondary)]">Agent-Native IM</p>
                    <p className="text-xs mt-1">{t('app.selectConversation')}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 min-w-0">
                <BotDetail
                  bot={selectedBot}
                  onBack={() => setSelectedBotId(null)}
                  onOpenConversation={handleOpenConversation}
                  onDelete={handleDeleteBot}
                  onStartChat={handleStartChatFromBot}
                />
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
    </div>
  )
}
