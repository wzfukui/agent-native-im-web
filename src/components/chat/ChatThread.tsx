import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageList } from './MessageList'
import { MessageComposer, type UploadedAttachment } from './MessageComposer'
import { GroupMembersPanel } from '@/components/conversation/GroupMembersPanel'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { useAuthStore } from '@/store/auth'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import type { Conversation, ActiveStream, Message } from '@/lib/types'
import { entityDisplayName, isBotOrService, cn } from '@/lib/utils'
import { cacheMessages, getCachedMessages, enqueueOutboxMessage, getOutboxMessageByTempId, deleteOutboxMessage, updateOutboxMessage } from '@/lib/cache'
import { DotsAnimation } from '@/components/ui/DotsAnimation'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { Search, Users, ArrowLeft, Loader2, X, Settings, ListTodo, Bug, Check } from 'lucide-react'
import { useSettingsStore } from '@/store/settings'
import { inspectChatBubbles, copyToClipboard } from '@/lib/layout-inspector'

const EMPTY_MESSAGES: Message[] = []

interface Props {
  conversation: Conversation
  onBack?: () => void
  onCancelStream?: (streamId: string, conversationId: number) => void
  onTyping?: (conversationId: number) => void
  typingEntities?: Map<number, { name: string; expiresAt: number; isProcessing?: boolean; phase?: string }>
  onToggleSettings?: () => void
  onToggleTasks?: () => void
  onEntitySendMessage?: (entity: import('@/lib/types').Entity) => void
  onEntityViewDetails?: (entity: import('@/lib/types').Entity) => void
  isArchived?: boolean
}

export function ChatThread({ conversation, onBack, onCancelStream, onTyping, typingEntities, onToggleSettings, onToggleTasks, onEntitySendMessage, onEntityViewDetails, isArchived }: Props) {
  const { t } = useTranslation()
  const devMode = useSettingsStore((s) => s.devMode)
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const messages = useMessagesStore((s) => s.byConv[conversation.id] ?? EMPTY_MESSAGES)
  const hasMore = useMessagesStore((s) => s.hasMore[conversation.id] ?? true)
  const streams = useMessagesStore((s) => s.streams)
  const progress = useMessagesStore((s) => s.progress[conversation.id])
  const setMessages = useMessagesStore((s) => s.setMessages)
  const prependMessages = useMessagesStore((s) => s.prependMessages)
  const addMessage = useMessagesStore((s) => s.addMessage)
  const revokeMessage = useMessagesStore((s) => s.revokeMessage)
  const updateMessageReactions = useMessagesStore((s) => s.updateMessageReactions)
  const addOptimisticMessage = useMessagesStore((s) => s.addOptimisticMessage)
  const replaceOptimisticMessage = useMessagesStore((s) => s.replaceOptimisticMessage)

  const removeOptimisticMessage = useMessagesStore((s) => s.removeOptimisticMessage)
  const setOptimisticState = useMessagesStore((s) => s.setOptimisticState)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [dragging, setDragging] = useState(false)
  const [debugCopied, setDebugCopied] = useState(false)
  const [initialLastRead, setInitialLastRead] = useState<number | undefined>(undefined)
  const [botThinkingEntity, setBotThinkingEntity] = useState<import('@/lib/types').Entity | null>(null)
  const botThinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragCountRef = useRef(0)
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const readReceipts = useConversationsStore((s) => s.readReceipts[conversation.id])
  const online = usePresenceStore((s) => s.online)

  // Determine other participant for direct chats
  const otherParticipant = conversation.participants?.find((p) => p.entity_id !== myEntity.id)?.entity
  const isGroup = conversation.conv_type === 'group' || conversation.conv_type === 'channel'
  const isOtherOnline = otherParticipant ? online.has(otherParticipant.id) : false

  // Check if current user is observer
  const myParticipant = conversation.participants?.find((p) => p.entity_id === myEntity.id)
  const isObserver = myParticipant?.role === 'observer'

  const botParticipants = useMemo(() => {
    return (conversation.participants || [])
      .filter((participant) => participant.entity_id !== myEntity.id && isBotOrService(participant.entity))
      .map((participant) => participant.entity)
      .filter((participantEntity): participantEntity is NonNullable<typeof participantEntity> => !!participantEntity)
  }, [conversation.participants, myEntity.id])

  const directBotParticipant = !isGroup ? (botParticipants[0] || null) : null

  // Start bot thinking indicator with auto-timeout
  const startBotThinking = useCallback((target?: import('@/lib/types').Entity | null) => {
    if (!target) return
    if (botThinkingTimerRef.current) clearTimeout(botThinkingTimerRef.current)
    setBotThinkingEntity(target)
    botThinkingTimerRef.current = setTimeout(() => setBotThinkingEntity(null), 60000)
  }, [])

  const stopBotThinking = useCallback(() => {
    if (botThinkingTimerRef.current) {
      clearTimeout(botThinkingTimerRef.current)
      botThinkingTimerRef.current = null
    }
    setBotThinkingEntity(null)
  }, [])

  const resolveProcessingEntity = useCallback((mentions?: number[]) => {
    if (!isGroup) return directBotParticipant
    if (!mentions || mentions.length === 0) return null
    const mentionedBots = botParticipants.filter((participant) => mentions.includes(participant.id))
    return mentionedBots.length === 1 ? mentionedBots[0] : null
  }, [isGroup, directBotParticipant, botParticipants])

  // Active streams for this conversation
  const convStreams = useMemo<ActiveStream[]>(
    () => Object.values(streams).filter((s) => s?.conversation_id === conversation.id),
    [streams, conversation.id],
  )

  // Consolidated: clear botThinking when a bot message arrives, typing starts, streaming starts, or conversation switches
  useEffect(() => {
    if (!botThinkingEntity) return

    // Bot message arrived
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.sender_id !== myEntity.id && (lastMsg.sender_type === 'bot' || lastMsg.sender_type === 'service')) {
        queueMicrotask(() => stopBotThinking())
        return
      }
    }

    // Typing indicator takes over
    if (typingEntities && typingEntities.size > 0) {
      const now = Date.now()
      for (const [eid, v] of typingEntities) {
        if (eid !== myEntity.id && v.expiresAt > now) {
          queueMicrotask(() => stopBotThinking())
          return
        }
      }
    }

    // Streaming started
    if (convStreams.length > 0) {
      queueMicrotask(() => stopBotThinking())
      return
    }

    // Cleanup on conversation switch
    return () => stopBotThinking()
  }, [messages, botThinkingEntity, myEntity.id, stopBotThinking, typingEntities, convStreams.length, conversation.id])

  // Typing/processing indicator (computed via callback to avoid impure Date.now() in memo)
  const computeTypingInfo = useCallback(() => {
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
  }, [typingEntities, myEntity.id, t])
  const typingInfo = computeTypingInfo()

  // Save draft before switching away, restore on switch
  const prevConvIdRef = useRef<number | null>(null)

  useEffect(() => {
    // Restore draft for new conversation
    try {
      const raw = localStorage.getItem(`draft:${conversation.id}`)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.replyTo) queueMicrotask(() => setReplyTo(draft.replyTo))
      }
    } catch { /* corrupt draft data */ }

    return () => {
      // Will be saved by MessageComposer's own draft logic
    }
  }, [conversation.id])

  // Reset search and reply state on conversation switch
  useEffect(() => {
    if (prevConvIdRef.current !== null && prevConvIdRef.current !== conversation.id) {
      queueMicrotask(() => {
        setSearching(false)
        setSearchQuery('')
        setSearchResults(null)
        // replyTo is restored from draft above, only reset if no draft
        const raw = localStorage.getItem(`draft:${conversation.id}`)
        if (!raw) setReplyTo(null)
      })
    }
    prevConvIdRef.current = conversation.id
  }, [conversation.id])

  // Load messages
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => setInitialLastRead(undefined))
    const load = async () => {
      setLoading(true)
      const cached = await getCachedMessages(conversation.id)
      if (!cancelled && cached.length > 0) {
        setMessages(conversation.id, cached, true)
      }
      const res = await api.listMessages(token, conversation.id)
      if (!cancelled && res.ok && res.data) {
        const msgs = (res.data.messages || []).reverse()
        setMessages(conversation.id, msgs, res.data.has_more)
        void cacheMessages(conversation.id, msgs)
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
  }, [conversation.id, token, setMessages, conversation.unread_count])

  // Persist in-memory messages for offline read (debounced to batch IndexedDB writes)
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (messages.length === 0) return
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      void cacheMessages(conversation.id, messages)
    }, 3000)
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [conversation.id, messages])

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
  }, [messages, token, conversation.id, updateConversation])

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
  }, [loading, hasMore, messages, token, conversation.id, prependMessages])

  // Debounced search
  useEffect(() => {
    if (!searching || !searchQuery.trim()) {
      queueMicrotask(() => setSearchResults(null))
      return
    }
    queueMicrotask(() => setSearchLoading(true))
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
  const handleFileUpload = useCallback(async (file: File): Promise<string | null> => {
    const res = await api.uploadFile(token, file)
    if (res.ok && res.data) return res.data.url
    return null
  }, [token])

  const handleSend = useCallback(async (text: string, uploadedAttachments?: UploadedAttachment[], mentions?: number[]) => {
    // Capture reply target before clearing
    const currentReplyTo = replyTo
    setReplyTo(null)
    // Clear draft on send
    localStorage.removeItem(`draft:${conversation.id}`)

    // Generate a temporary ID for optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()}`

    const hasAttachments = uploadedAttachments && uploadedAttachments.length > 0
    const contentType = hasAttachments && uploadedAttachments.some((a) => a.type === 'image') ? 'image' : 'text'

    // Create optimistic message with attachments (already uploaded)
    const optimisticMsg: Message = {
      id: -Math.floor(Math.random() * 1000000),
      conversation_id: conversation.id,
      sender_id: myEntity.id,
      sender_type: myEntity.entity_type,
      sender: myEntity,
      content_type: contentType,
      layers: {
        summary: text,
        data: { body: text },
      },
      created_at: new Date().toISOString(),
      attachments: hasAttachments ? uploadedAttachments : [],
      mentions,
      reply_to: currentReplyTo?.id,
    }

    // Add optimistic message immediately (with attachments visible)
    addOptimisticMessage(tempId, optimisticMsg)

    const queueForOffline = async (state: 'queued' | 'failed') => {
      const queuedId = await enqueueOutboxMessage({
        temp_id: tempId,
        conversation_id: conversation.id,
        content_type: contentType,
        text,
        mentions,
        reply_to: currentReplyTo?.id,
        created_at: new Date().toISOString(),
        attempts: 0,
        sync_state: state,
      })
      setOptimisticState(tempId, queuedId ? state : 'failed')
    }

    if (!navigator.onLine) {
      await queueForOffline('queued')
      return
    }

    try {
      const res = await api.sendMessage(token, {
        conversation_id: conversation.id,
        content_type: contentType,
        layers: {
          summary: text,
          data: { body: text },
        },
        attachments: hasAttachments ? uploadedAttachments : undefined,
        mentions,
        reply_to: currentReplyTo?.id,
      })

      if (res.ok && res.data) {
        replaceOptimisticMessage(tempId, res.data)
        startBotThinking(resolveProcessingEntity(mentions))
      } else {
        if (hasAttachments) {
          removeOptimisticMessage(tempId, conversation.id)
        } else {
          await queueForOffline('failed')
        }
      }
    } catch {
      if (hasAttachments) {
        removeOptimisticMessage(tempId, conversation.id)
      } else {
        await queueForOffline('failed')
      }
    }
  }, [token, conversation.id, myEntity, replyTo, addOptimisticMessage, replaceOptimisticMessage, removeOptimisticMessage, setOptimisticState, startBotThinking, resolveProcessingEntity])

  const handleRetryOutbox = useCallback(async (tempId: string) => {
    const item = await getOutboxMessageByTempId(tempId)
    if (!item || !item.id) return
    if (!navigator.onLine) {
      setOptimisticState(tempId, 'queued')
      return
    }

    setOptimisticState(tempId, 'sending')
    await updateOutboxMessage(item.id, {
      sync_state: 'sending',
      attempts: (item.attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      last_error: '',
    })
    const res = await api.sendMessage(token, {
      conversation_id: item.conversation_id,
      content_type: item.content_type || 'text',
      layers: {
        summary: item.text,
        data: { body: item.text },
      },
      mentions: item.mentions,
      reply_to: item.reply_to,
    })
    if (res.ok && res.data) {
      replaceOptimisticMessage(tempId, res.data)
      await deleteOutboxMessage(item.id)
    } else {
      setOptimisticState(tempId, 'failed')
      await updateOutboxMessage(item.id, {
        sync_state: 'failed',
        last_attempt_at: new Date().toISOString(),
        last_error: typeof res.error === 'string' ? res.error : (res.error?.message || 'send failed'),
      })
    }
  }, [token, replaceOptimisticMessage, setOptimisticState])

  // Revoke message
  const handleRevoke = useCallback(async (msgId: number) => {
    if (isArchived) return // Block revoke for archived conversations
    const res = await api.revokeMessage(token, msgId)
    if (res.ok) {
      revokeMessage(conversation.id, msgId)
    }
  }, [token, conversation.id, isArchived, revokeMessage])

  const handleReact = useCallback(async (msgId: number, emoji: string) => {
    const res = await api.toggleReaction(token, msgId, emoji)
    if (res.ok && res.data) {
      updateMessageReactions(conversation.id, msgId, res.data.reactions)
    }
  }, [token, conversation.id, updateMessageReactions])

  // Send audio message
  const handleAudioSend = useCallback(async (blob: Blob, duration: number) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type })

    // Optimistic message — show immediately
    const optimisticMsg: Message = {
      id: -Math.floor(Math.random() * 1000000),
      conversation_id: conversation.id,
      sender_id: myEntity.id,
      sender_type: myEntity.entity_type,
      sender: myEntity,
      content_type: 'audio',
      layers: { summary: `Voice message (${duration}s)` },
      created_at: new Date().toISOString(),
      attachments: [{ type: 'audio', filename: file.name, mime_type: blob.type, size: blob.size, duration }],
    }
    addOptimisticMessage(tempId, optimisticMsg)

    try {
      const uploadRes = await api.uploadFile(token, file)
      if (!uploadRes.ok || !uploadRes.data) {
        setOptimisticState(tempId, 'failed')
        return
      }
      const res = await api.sendMessage(token, {
        conversation_id: conversation.id,
        content_type: 'audio',
        layers: { summary: `Voice message (${duration}s)` },
        attachments: [{
          type: 'audio', url: uploadRes.data.url,
          filename: file.name, mime_type: blob.type, size: blob.size, duration,
        }],
      })
      if (res.ok && res.data) {
        replaceOptimisticMessage(tempId, res.data)
      } else {
        setOptimisticState(tempId, 'failed')
      }
    } catch {
      setOptimisticState(tempId, 'failed')
    }
  }, [token, conversation.id, myEntity, addOptimisticMessage, replaceOptimisticMessage, setOptimisticState])

  // Interaction reply
  const handleInteractionReply = useCallback(async (msgId: number, choice: string, label: string) => {
    const sourceMessage = messages.find((message) => message.id === msgId)
    const processingEntity = sourceMessage?.sender && isBotOrService(sourceMessage.sender)
      ? sourceMessage.sender
      : null
    const tempId = `interaction-${conversation.id}-${msgId}-${Date.now()}`
    const optimisticId = -Date.now()
    addOptimisticMessage(tempId, {
      id: optimisticId,
      conversation_id: conversation.id,
      sender_id: myEntity.id,
      sender: myEntity,
      content_type: 'text',
      layers: {
        summary: label,
        data: { interaction_reply: { reply_to: msgId, choice } },
      },
      reply_to: msgId,
      created_at: new Date().toISOString(),
    })

    const res = await api.sendMessage(token, {
      conversation_id: conversation.id,
      content_type: 'text',
      layers: {
        summary: label,
        data: { interaction_reply: { reply_to: msgId, choice } },
      },
      reply_to: msgId,
    })
    if (res.ok && res.data) {
      replaceOptimisticMessage(tempId, res.data)
      startBotThinking(processingEntity)
      return
    }
    setOptimisticState(tempId, 'failed')
  }, [token, conversation.id, messages, myEntity, addOptimisticMessage, replaceOptimisticMessage, setOptimisticState, startBotThinking])

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current = 0
    setDragging(false)
    if (isArchived) return // Block file drop for archived conversations
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return
    // Upload dropped files concurrently
    const results = await Promise.allSettled(
      droppedFiles.map(async (file) => {
        const url = await handleFileUpload(file)
        if (!url) throw new Error('Upload failed')
        return {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
        } as UploadedAttachment
      })
    )
    const uploaded = results
      .filter((r): r is PromiseFulfilledResult<UploadedAttachment> => r.status === 'fulfilled')
      .map((r) => r.value)
    if (uploaded.length > 0) {
      handleSend('', uploaded)
    }
  }, [handleSend, handleFileUpload, isArchived])

  return (
    <div
      className="flex flex-col h-full bg-[var(--color-bg-primary)] relative overflow-hidden"
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl">
        {onBack && (
          <button onClick={onBack} aria-label={t('a11y.back')} className="md:hidden w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer min-w-[32px]">
            <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {/* Clickable title area — opens settings/detail panel */}
        <button
          onClick={() => isGroup ? setShowMembers(true) : onToggleSettings?.()}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded-2xl px-1.5 py-1 hover:bg-[var(--color-bg-hover)]/60 transition-colors"
        >
          {isGroup ? (
            <div className="w-9 h-9 rounded-full bg-[var(--color-accent-dim)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
          ) : (
            <EntityAvatar entity={otherParticipant} size="sm" showStatus />
          )}

          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {conversation.title || entityDisplayName(otherParticipant)}
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {isGroup
                ? t('conversation.participants', { count: conversation.participants?.length || 0 })
                : isOtherOnline ? (
                    <span className="text-[var(--color-success)]">{t('common.online')}</span>
                  ) : t('common.offline')
              }
            </p>
          </div>
        </button>

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
          aria-label={t('a11y.search')}
          className={cn(
            'w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors min-w-[32px]',
            searching ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          )}
        >
          <Search className="w-4 h-4" />
        </button>

        {onToggleTasks && !isArchived && (
          <button
            onClick={onToggleTasks}
            aria-label={t('a11y.tasks')}
            className="w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] min-w-[32px]"
          >
            <ListTodo className="w-4 h-4" />
          </button>
        )}
        {/* Debug button — copies layout report to clipboard (dev mode only) */}
        {devMode && (
          <button
            onClick={async () => {
              const report = inspectChatBubbles('chat-message-list')
              const ok = await copyToClipboard(report)
              if (ok) {
                setDebugCopied(true)
                setTimeout(() => setDebugCopied(false), 2000)
              }
            }}
            className={cn(
              'w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors min-w-[32px]',
              debugCopied ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]',
            )}
            title={t('settings.devMode')}
          >
            {debugCopied ? <Check className="w-4 h-4" /> : <Bug className="w-4 h-4" />}
          </button>
        )}
        {onToggleSettings && (
          <button
            onClick={onToggleSettings}
            aria-label={t('a11y.settings')}
            className="w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] min-w-[32px]"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search bar */}
      {searching && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl">
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
        <SkeletonLoader variant="chat-messages" />
      ) : (
        <MessageList
          messages={searchResults ?? messages}
          myEntityId={myEntity.id}
          loading={searchResults !== null ? searchLoading : loading}
          hasMore={searchResults !== null ? false : hasMore}
          lastReadMessageId={searchResults ? undefined : initialLastRead}
          streams={searchResults ? undefined : convStreams}
          participants={conversation.participants}
          readReceipts={searchResults ? undefined : readReceipts}
          onLoadMore={searchResults !== null ? undefined : handleLoadMore}
          onInteractionReply={handleInteractionReply}
          onRevoke={isArchived ? undefined : handleRevoke}
          onReply={isArchived ? undefined : (msg) => setReplyTo(msg)}
          onReact={isArchived ? undefined : handleReact}
          onRetryOutbox={isArchived ? undefined : handleRetryOutbox}
          onCancelStream={onCancelStream}
          onEntitySendMessage={onEntitySendMessage}
          onEntityViewDetails={onEntityViewDetails}
          thinkingEntity={botThinkingEntity || undefined}
          progress={progress}
        />
      )}

      {/* Group members panel */}
      {showMembers && isGroup && (
        <GroupMembersPanel
          conversation={conversation}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Typing / Processing indicator */}
      {typingInfo && (
        <div
          aria-live="polite"
          className={cn(
          'px-4 py-1 text-[11px] italic flex items-center gap-1.5',
          typingInfo.isProcessing ? 'text-[var(--color-bot)]' : 'text-[var(--color-text-muted)]',
        )}>
          {typingInfo.isProcessing && (
            <DotsAnimation size="sm" />
          )}
          {typingInfo.text}
        </div>
      )}

      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        onSend={handleSend}
        onAudioSend={handleAudioSend}
        onFileUpload={handleFileUpload}
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
