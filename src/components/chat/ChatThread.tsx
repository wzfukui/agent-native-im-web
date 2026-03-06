import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { StreamingOverlay } from './StreamingOverlay'
import { GroupMembersPanel } from '@/components/conversation/GroupMembersPanel'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { useAuthStore } from '@/store/auth'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import type { Conversation, ActiveStream, Message } from '@/lib/types'
import { entityDisplayName, cn } from '@/lib/utils'
import { Search, Users, ArrowLeft, Loader2, X, Settings, ListTodo } from 'lucide-react'

const EMPTY_MESSAGES: Message[] = []

interface Props {
  conversation: Conversation
  onBack?: () => void
  onCancelStream?: (streamId: string, conversationId: number) => void
  onTyping?: (conversationId: number) => void
  typingEntities?: Map<number, { name: string; expiresAt: number; isProcessing?: boolean; phase?: string }>
  onToggleSettings?: () => void
  onToggleTasks?: () => void
  isArchived?: boolean
}

export function ChatThread({ conversation, onBack, onCancelStream, onTyping, typingEntities, onToggleSettings, onToggleTasks, isArchived }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const messages = useMessagesStore((s) => s.byConv[conversation.id] ?? EMPTY_MESSAGES)
  const hasMore = useMessagesStore((s) => s.hasMore[conversation.id] ?? true)
  const streams = useMessagesStore((s) => s.streams)
  const setMessages = useMessagesStore((s) => s.setMessages)
  const prependMessages = useMessagesStore((s) => s.prependMessages)
  const addMessage = useMessagesStore((s) => s.addMessage)
  const revokeMessage = useMessagesStore((s) => s.revokeMessage)
  const updateMessageReactions = useMessagesStore((s) => s.updateMessageReactions)
  const addOptimisticMessage = useMessagesStore((s) => s.addOptimisticMessage)
  const replaceOptimisticMessage = useMessagesStore((s) => s.replaceOptimisticMessage)
  const removeOptimisticMessage = useMessagesStore((s) => s.removeOptimisticMessage)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [dragging, setDragging] = useState(false)
  const [initialLastRead, setInitialLastRead] = useState<number | undefined>(undefined)
  const dragCountRef = useRef(0)
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const online = usePresenceStore((s) => s.online)

  // Determine other participant for direct chats
  const otherParticipant = conversation.participants?.find((p) => p.entity_id !== myEntity.id)?.entity
  const isGroup = conversation.conv_type === 'group' || conversation.conv_type === 'channel'
  const isOtherOnline = otherParticipant ? online.has(otherParticipant.id) : false

  // Check if current user is observer
  const myParticipant = conversation.participants?.find((p) => p.entity_id === myEntity.id)
  const isObserver = myParticipant?.role === 'observer'

  // Typing/processing indicator
  const typingInfo = useMemo(() => {
    if (!typingEntities || typingEntities.size === 0) return null
    const now = Date.now()
    const typingNames: string[] = []
    let processingEntry: { name: string; phase?: string } | null = null
    typingEntities.forEach((v, eid) => {
      if (eid !== myEntity.id && v.expiresAt > now) {
        if (v.isProcessing) {
          processingEntry = { name: v.name, phase: v.phase }
        } else {
          typingNames.push(v.name)
        }
      }
    })
    if (processingEntry) {
      const phaseKey = (processingEntry as { phase?: string }).phase
      const phaseText = phaseKey ? t(`chat.${phaseKey}`, { defaultValue: t('chat.processing') }) : t('chat.processing')
      return { text: `${(processingEntry as { name: string }).name} ${phaseText}`, isProcessing: true }
    }
    if (typingNames.length === 0) return null
    if (typingNames.length === 1) return { text: t('message.isTyping', { name: typingNames[0] }), isProcessing: false }
    return { text: t('message.areTyping', { names: typingNames.slice(0, 2).join(', ') }), isProcessing: false }
  }, [typingEntities, myEntity.id])

  // Active streams for this conversation
  const convStreams = useMemo<ActiveStream[]>(
    () => Object.values(streams).filter((s) => s?.conversation_id === conversation.id),
    [streams, conversation.id],
  )

  // Save draft before switching away, restore on switch
  const prevConvIdRef = useRef<number | null>(null)

  useEffect(() => {
    // Restore draft for new conversation
    try {
      const raw = localStorage.getItem(`draft:${conversation.id}`)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.replyTo) setReplyTo(draft.replyTo)
      }
    } catch {}

    return () => {
      // Will be saved by MessageComposer's own draft logic
    }
  }, [conversation.id])

  // Reset search and reply state on conversation switch
  useEffect(() => {
    if (prevConvIdRef.current !== null && prevConvIdRef.current !== conversation.id) {
      setSearching(false)
      setSearchQuery('')
      setSearchResults(null)
      // replyTo is restored from draft above, only reset if no draft
      const raw = localStorage.getItem(`draft:${conversation.id}`)
      if (!raw) setReplyTo(null)
    }
    prevConvIdRef.current = conversation.id
  }, [conversation.id])

  // Load messages
  useEffect(() => {
    let cancelled = false
    setInitialLastRead(undefined)
    const load = async () => {
      setLoading(true)
      const res = await api.listMessages(token, conversation.id)
      if (!cancelled && res.ok && res.data) {
        const msgs = (res.data.messages || []).reverse()
        setMessages(conversation.id, msgs, res.data.has_more)
        // Capture last-read position for new message divider
        const unread = conversation.unread_count ?? 0
        if (unread > 0 && msgs.length > unread) {
          setInitialLastRead(msgs[msgs.length - 1 - unread].id)
        }
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [conversation.id, token])

  // Mark as read when viewing messages (debounced to avoid excessive API calls)
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    const timer = setTimeout(() => {
      api.markAsRead(token, conversation.id, lastMsg.id).then((res) => {
        if (res.ok) {
          updateConversation(conversation.id, { unread_count: 0 })
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [messages.length, conversation.id])

  // Load more
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const oldest = messages[0]
    if (!oldest) return
    setLoading(true)
    const res = await api.listMessages(token, conversation.id, oldest.id)
    if (res.ok && res.data) {
      prependMessages(conversation.id, (res.data.messages || []).reverse(), res.data.has_more)
    }
    setLoading(false)
  }, [loading, hasMore, messages, token, conversation.id])

  // Debounced search
  useEffect(() => {
    if (!searching || !searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setSearchLoading(true)
    const timeout = setTimeout(async () => {
      const res = await api.searchMessages(token, conversation.id, searchQuery.trim())
      if (res.ok && res.data) {
        setSearchResults(res.data.messages || [])
      }
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, searching, token, conversation.id])

  // Send message
  const handleSend = useCallback(async (text: string, files?: File[], mentions?: number[]) => {
    // Capture reply target before clearing
    const currentReplyTo = replyTo
    setReplyTo(null)
    // Clear draft on send
    localStorage.removeItem(`draft:${conversation.id}`)

    // Generate a temporary ID for optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()}`

    // Create optimistic message
    const optimisticMsg: Message = {
      id: -Math.floor(Math.random() * 1000000), // Negative ID for optimistic messages
      conversation_id: conversation.id,
      sender_id: myEntity.id,
      sender_type: myEntity.entity_type,
      sender: myEntity,
      content_type: 'text',
      layers: {
        summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
        data: { body: text },
      },
      created_at: new Date().toISOString(),
      attachments: [],
      mentions,
      reply_to: currentReplyTo?.id,
    }

    // Add optimistic message immediately
    addOptimisticMessage(tempId, optimisticMsg)

    try {
      let attachments: { type: string; url: string; filename: string; mime_type: string; size: number }[] = []

      // Upload files first
      if (files && files.length > 0) {
        let uploadFailed = false
        for (const file of files) {
          const res = await api.uploadFile(token, file)
          if (res.ok && res.data) {
            attachments.push({
              type: file.type.startsWith('image/') ? 'image' : 'file',
              url: res.data.url,
              filename: file.name,
              mime_type: file.type,
              size: file.size,
            })
          } else {
            uploadFailed = true
          }
        }
        // If some files failed and there's no text, abort the send
        if (uploadFailed && attachments.length === 0 && !text.trim()) {
          removeOptimisticMessage(tempId, conversation.id)
          return
        }
      }

      const contentType = attachments.some((a) => a.type === 'image') ? 'image' : 'text'

      const res = await api.sendMessage(token, {
        conversation_id: conversation.id,
        content_type: contentType,
        layers: {
          summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
          data: { body: text },
        },
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions,
        reply_to: currentReplyTo?.id,
      })

      if (res.ok && res.data) {
        // Replace optimistic message with real message
        replaceOptimisticMessage(tempId, res.data)
      } else {
        // Remove optimistic message on error
        removeOptimisticMessage(tempId, conversation.id)
      }
    } catch (error) {
      // Remove optimistic message on error
      removeOptimisticMessage(tempId, conversation.id)
    }
  }, [token, conversation.id, myEntity, replyTo, addOptimisticMessage, replaceOptimisticMessage, removeOptimisticMessage])

  // Revoke message
  const handleRevoke = useCallback(async (msgId: number) => {
    if (isArchived) return // Block revoke for archived conversations
    const res = await api.revokeMessage(token, msgId)
    if (res.ok) {
      revokeMessage(conversation.id, msgId)
    }
  }, [token, conversation.id, isArchived])

  const handleReact = useCallback(async (msgId: number, emoji: string) => {
    const res = await api.toggleReaction(token, msgId, emoji)
    if (res.ok && res.data) {
      updateMessageReactions(conversation.id, msgId, res.data.reactions)
    }
  }, [token, conversation.id])

  // Send audio message
  const handleAudioSend = useCallback(async (blob: Blob, duration: number) => {
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type })
    const uploadRes = await api.uploadFile(token, file)
    if (!uploadRes.ok || !uploadRes.data) return

    const res = await api.sendMessage(token, {
      conversation_id: conversation.id,
      content_type: 'audio',
      layers: {
        summary: `Voice message (${duration}s)`,
      },
      attachments: [{
        type: 'audio',
        url: uploadRes.data.url,
        filename: file.name,
        mime_type: blob.type,
        size: blob.size,
        duration,
      }],
    })
    if (res.ok && res.data) addMessage(res.data)
  }, [token, conversation.id])

  // Interaction reply
  const handleInteractionReply = useCallback(async (msgId: number, choice: string, label: string) => {
    const res = await api.sendMessage(token, {
      conversation_id: conversation.id,
      content_type: 'text',
      layers: {
        summary: label,
        data: { interaction_reply: { reply_to: msgId, choice } },
      },
      reply_to: msgId,
    })
    if (res.ok && res.data) addMessage(res.data)
  }, [token, conversation.id])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current--
    if (dragCountRef.current === 0) setDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current = 0
    setDragging(false)
    if (isArchived) return // Block file drop for archived conversations
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleSend('', droppedFiles)
    }
  }, [handleSend, isArchived])

  return (
    <div
      className="flex flex-col h-full bg-[var(--color-bg-primary)] relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-40 bg-[var(--color-accent)]/10 border-2 border-dashed border-[var(--color-accent)] rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-sm font-medium text-[var(--color-accent)]">{t('message.dropFiles')}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {onBack && (
          <button onClick={onBack} className="lg:hidden w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {isGroup ? (
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center">
            <Users className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
        ) : (
          <EntityAvatar entity={otherParticipant} size="sm" showStatus />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {conversation.title || entityDisplayName(otherParticipant)}
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {isGroup
              ? (
                  <button
                    onClick={() => setShowMembers(true)}
                    className="hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                  >
                    {t('conversation.participants', { count: conversation.participants?.length || 0 })}
                  </button>
                )
              : isOtherOnline ? (
                  <span className="text-[var(--color-success)]">{t('common.online')}</span>
                ) : t('common.offline')
            }
          </p>
        </div>

        <button
          onClick={() => {
            if (searching) {
              setSearching(false)
              setSearchQuery('')
              setSearchResults(null)
            } else {
              setSearching(true)
            }
          }}
          className={cn(
            'w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors',
            searching ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          )}
        >
          <Search className="w-4 h-4" />
        </button>

        {onToggleTasks && !isArchived && (
          <button
            onClick={onToggleTasks}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            <ListTodo className="w-4 h-4" />
          </button>
        )}
        {onToggleSettings && (
          <button
            onClick={onToggleSettings}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search bar */}
      {searching && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('conversation.searchMessages')}
              autoFocus
              className="flex-1 h-8 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
            {searchLoading && <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin flex-shrink-0" />}
            {searchQuery && !searchLoading && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null) }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--color-bg-hover)] cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
          {searchResults !== null && !searchLoading && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
              {searchResults.length === 0 ? t('conversation.noResults') : t('conversation.resultsFound', { count: searchResults.length })}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[var(--color-text-muted)]" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <MessageList
          messages={searchResults ?? messages}
          myEntityId={myEntity.id}
          loading={searchResults !== null ? searchLoading : loading}
          hasMore={searchResults !== null ? false : hasMore}
          lastReadMessageId={searchResults ? undefined : initialLastRead}
          onLoadMore={searchResults !== null ? undefined : handleLoadMore}
          onInteractionReply={handleInteractionReply}
          onRevoke={isArchived ? undefined : handleRevoke}
          onReply={isArchived ? undefined : (msg) => setReplyTo(msg)}
          onReact={isArchived ? undefined : handleReact}
        />
      )}

      {/* Streaming overlay */}
      <StreamingOverlay streams={convStreams} onCancel={onCancelStream} />

      {/* Group members panel */}
      {showMembers && isGroup && (
        <GroupMembersPanel
          conversation={conversation}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Typing / Processing indicator */}
      {typingInfo && (
        <div className={cn(
          'px-4 py-1 text-[11px] italic flex items-center gap-1.5',
          typingInfo.isProcessing ? 'text-[var(--color-bot)]' : 'text-[var(--color-text-muted)]',
        )}>
          {typingInfo.isProcessing && (
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-bot)] animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-bot)] animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-bot)] animate-pulse" style={{ animationDelay: '0.4s' }} />
            </span>
          )}
          {typingInfo.text}
        </div>
      )}

      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        onSend={handleSend}
        onAudioSend={handleAudioSend}
        onTyping={onTyping ? () => onTyping(conversation.id) : undefined}
        placeholder={t('conversation.typeMessage')}
        participants={conversation.participants}
        isObserver={isObserver || isArchived}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  )
}
