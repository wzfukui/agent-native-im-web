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
import { BotManager } from '@/components/entity/BotManager'
import { NewConversationDialog } from '@/components/conversation/NewConversationDialog'
import { AnimpWebSocket } from '@/lib/ws-client'
import type { WSMessage, Message, Entity } from '@/lib/types'
import { MessageSquare, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function App() {
  const { token, entity, setAuth, logout } = useAuthStore()
  const { conversations, activeId, setConversations, setActive, addConversation, updateConversation } = useConversationsStore()
  const { addMessage, revokeMessage, startStream, updateStream, endStream } = useMessagesStore()
  const { setOnline, setWsConnected } = usePresenceStore()

  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [showBotManager, setShowBotManager] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()
  const wsRef = useRef<AnimpWebSocket | null>(null)

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
    }
  }, [token])

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
        case 'entity.online':
          if ((msg.data as { self?: boolean })?.self) {
            setWsConnected(true)
          }
          break
        case 'entity.offline':
          if ((msg.data as { self?: boolean })?.self) {
            setWsConnected(false)
          }
          break

        case 'message.new': {
          const message = msg.data as Message
          if (message) {
            addMessage(message)
            updateConversation(message.conversation_id, {
              last_message: message,
              updated_at: message.created_at,
            })
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

    ws.connect()

    return () => {
      unsub()
      ws.disconnect()
      wsRef.current = null
    }
  }, [token, entity?.id])

  // ─── New chat from bot manager ─────────────────────────────────
  const handleStartChatFromBot = (entityId: number) => {
    setShowBotManager(false)
    setNewChatEntityId(entityId)
    setShowNewChat(true)
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

  // ─── Main layout ───────────────────────────────────────────────
  return (
    <div className="h-full flex">
      {/* Icon sidebar */}
      <Sidebar onManageBots={() => setShowBotManager(true)} />

      {/* Conversation list */}
      <div className={cn(
        'w-72 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0',
        activeId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col',
      )}>
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
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        {activeConv ? (
          <ChatThread
            key={activeConv.id}
            conversation={activeConv}
            onBack={() => setActive(null)}
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
        )}
      </div>

      {/* Modals */}
      {showBotManager && (
        <BotManager
          onClose={() => setShowBotManager(false)}
          onStartChat={handleStartChatFromBot}
        />
      )}
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
