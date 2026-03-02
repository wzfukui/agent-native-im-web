import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Sidebar } from '@/components/layout/Sidebar'
import { ConversationList } from '@/components/conversation/ConversationList'
import { ChatThread } from '@/components/chat/ChatThread'
import { BotList } from '@/components/entity/BotList'
import { BotDetail } from '@/components/entity/BotDetail'
import { NewConversationDialog } from '@/components/conversation/NewConversationDialog'
import { AnimpWebSocket } from '@/lib/ws-client'
import type { WSMessage, Message, Entity } from '@/lib/types'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function App() {
  const { token, entity, setAuth, logout } = useAuthStore()
  const { conversations, activeId, setConversations, setActive, addConversation, updateConversation } = useConversationsStore()
  const { addMessage, revokeMessage, startStream, updateStream, endStream } = useMessagesStore()
  const { setOnline, setWsConnected } = usePresenceStore()

  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [viewMode, setViewMode] = useState<'chat' | 'bots'>('chat')
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()
  const wsRef = useRef<AnimpWebSocket | null>(null)
  const [botEntities, setBotEntities] = useState<Entity[]>([])

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
        setLoginError(res.error || 'Login failed')
      }
    } catch {
      setLoginError('Network error — cannot reach server')
    }
  }

  // ─── Register ────────────────────────────────────────────────────
  const handleRegister = (token: string, entity: Entity) => {
    setShowRegister(false)
    setAuth(token, entity)
  }

  // ─── Load conversations ────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!token) return
    const res = await api.listConversations(token)
    if (res.ok && res.data) {
      const convs = Array.isArray(res.data) ? res.data : []
      setConversations(convs)

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
            for (const msg of res.data.messages) {
              addMessage(msg)
            }
          }
        })
      }
      // Also refresh conversation list
      loadConversations()
    })

    ws.connect()

    return () => {
      unsub()
      ws.disconnect()
      wsRef.current = null
    }
  }, [token, entity?.id])

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
        onToggleBots={() => setViewMode(viewMode === 'bots' ? 'chat' : 'bots')}
      />

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
                api.updateConversation(tok, id, title).then((res) => {
                  if (res.ok && res.data) {
                    updateConversation(id, { title: res.data.title })
                  }
                })
              }
            }}
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
      <div className="flex-1 min-w-0">
        {viewMode === 'chat' ? (
          activeConv ? (
            <ChatThread
              key={activeConv.id}
              conversation={activeConv}
              onBack={() => setActive(null)}
              onCancelStream={handleCancelStream}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-bot)]/10 flex items-center justify-center">
                <Zap className="w-10 h-10 text-[var(--color-accent)] opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-[var(--color-text-secondary)]">Agent-Native IM</p>
                <p className="text-xs mt-1">Select a conversation or start a new one</p>
              </div>
            </div>
          )
        ) : (
          <BotDetail
            bot={selectedBot}
            onBack={() => setSelectedBotId(null)}
            onOpenConversation={handleOpenConversation}
            onDelete={handleDeleteBot}
            onStartChat={handleStartChatFromBot}
          />
        )}
      </div>

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
