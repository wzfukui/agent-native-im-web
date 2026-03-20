import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageBubble } from './MessageBubble'
import { StreamingBubble } from './StreamingBubble'
import { ThinkingBubble } from './ThinkingBubble'
import { DotsAnimation } from '@/components/ui/DotsAnimation'
import { Loader2 } from 'lucide-react'
import { Square } from 'lucide-react'
import type { Message, ActiveStream, Entity } from '@/lib/types'
import type { ProgressEntry } from '@/store/messages'
import type { ReadReceipt } from '@/store/conversations'
import { formatDateSeparator } from '@/lib/utils'

interface Props {
  messages: Message[]
  myEntityId: number
  loading?: boolean
  hasMore?: boolean
  lastReadMessageId?: number
  streams?: ActiveStream[]
  participants?: { entity_id: number; entity?: Entity }[]
  readReceipts?: Record<number, ReadReceipt>
  onLoadMore?: () => void
  onInteractionReply?: (msgId: number, choice: string, label: string) => void
  onRevoke?: (msgId: number) => void
  onReply?: (msg: Message) => void
  onReact?: (msgId: number, emoji: string) => void
  onRetryOutbox?: (tempId: string) => void
  onCancelStream?: (streamId: string, conversationId: number) => void
  onEntitySendMessage?: (entity: Entity) => void
  onEntityViewDetails?: (entity: Entity) => void
  thinkingEntity?: Entity
  progress?: ProgressEntry
}

export function MessageList({ messages, myEntityId, loading, hasMore, lastReadMessageId, streams, participants, readReceipts, onLoadMore, onInteractionReply, onRevoke, onReply, onReact, onRetryOutbox, onCancelStream, onEntitySendMessage, onEntityViewDetails, thinkingEntity, progress }: Props) {
  const { t } = useTranslation()
  const endRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)
  const isNearBottomRef = useRef(true)
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null)

  // Scroll to a specific message and briefly highlight it
  const handleScrollToMessage = useCallback((msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(msgId)
      setTimeout(() => setHighlightedMsgId(null), 1500)
    }
  }, [])

  // Track whether user is near bottom (for auto-scroll during streaming)
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120

    // Load more on scroll to top
    if (hasMore && !loading && scrollTop < 100) {
      onLoadMore?.()
    }
  }

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevLengthRef.current && isNearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: messages.length - prevLengthRef.current > 5 ? 'auto' : 'smooth' })
    }
    prevLengthRef.current = messages.length
  }, [messages.length])

  // Auto-scroll during streaming updates (when user is near bottom)
  const streamContent = streams?.map(s => s.layers.summary || '').join('') || ''
  useEffect(() => {
    if (streams && streams.length > 0 && isNearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamContent, streams])

  // Auto-scroll when thinking indicator or progress appears
  useEffect(() => {
    if (thinkingEntity && isNearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [thinkingEntity])

  useEffect(() => {
    if (progress && isNearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [progress])

  // Initial scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [])

  // Build message map for reply previews
  const messageMap = useMemo(() => {
    const map = new Map<number, Message>()
    for (const msg of messages) map.set(msg.id, msg)
    return map
  }, [messages])
  const interactionResponseMap = useMemo(() => {
    const map = new Map<number, Message>()
    for (const msg of messages) {
      const reply = msg.layers?.data?.interaction_reply as { reply_to?: number } | undefined
      const replyToId = typeof reply?.reply_to === 'number' ? reply.reply_to : undefined
      if (replyToId) map.set(replyToId, msg)
    }
    return map
  }, [messages])

  // Pre-compute date strings for separator checks
  const dateSepIndices = useMemo(() => {
    const set = new Set<number>()
    set.add(0)
    for (let i = 1; i < messages.length; i++) {
      if (new Date(messages[i].created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()) {
        set.add(i)
      }
    }
    return set
  }, [messages])

  // Determine which self-message (if any) should show the "Read" indicator.
  // Show "Read" on the last message sent by the current user that has been read by at least one other participant.
  const readIndicatorMsgId = useMemo(() => {
    if (!readReceipts) return null
    // Find the highest message_id that any other participant has read
    let maxReadMsgId = 0
    for (const [entityId, receipt] of Object.entries(readReceipts)) {
      if (Number(entityId) === myEntityId) continue
      if (receipt.messageId > maxReadMsgId) maxReadMsgId = receipt.messageId
    }
    if (maxReadMsgId === 0) return null
    // Find the last self-message with id <= maxReadMsgId
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.sender_id === myEntityId && msg.id > 0 && msg.id <= maxReadMsgId) {
        return msg.id
      }
    }
    return null
  }, [readReceipts, messages, myEntityId])

  // Group consecutive messages from same sender
  const shouldShowSender = (msg: Message, i: number): boolean => {
    if (i === 0) return true
    const prev = messages[i - 1]
    if (prev.sender_id !== msg.sender_id) return true
    const gap = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()
    return gap > 300000
  }

  // Resolve sender entity for streams
  const findEntity = (senderId: number): Entity | undefined => {
    return participants?.find(p => p.entity_id === senderId)?.entity
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      id="chat-message-list"
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3"
    >
      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center py-3">
          {loading ? (
            <Loader2 className="w-4 h-4 text-[var(--color-text-muted)]" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer transition-colors"
            >
              {t('message.loadEarlier')}
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div>
        {messages.map((msg, i) => {
          const showDateSep = dateSepIndices.has(i)
          const showDivider = lastReadMessageId != null &&
            i > 0 &&
            messages[i - 1].id === lastReadMessageId &&
            msg.id !== lastReadMessageId &&
            msg.sender_id !== myEntityId
          const showSender = shouldShowSender(msg, i)
          // gap-1 between same-sender consecutive messages, gap-3 between different senders
          const gapClass = i === 0 ? '' : showSender ? 'mt-3' : 'mt-1'

          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`${gapClass}${highlightedMsgId === msg.id ? ' msg-highlight-flash' : ''}`}>
              {showDateSep && (
                <div className="flex items-center justify-center gap-3 py-3 mx-auto max-w-[60%]">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, var(--color-border), transparent)' }} />
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium flex-shrink-0">
                    {formatDateSeparator(msg.created_at, t('app.today'), t('app.yesterday'))}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, var(--color-border), transparent)' }} />
                </div>
              )}
              {showDivider && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-[var(--color-accent)]/30" />
                  <span className="text-[10px] text-[var(--color-accent)] font-medium flex-shrink-0">
                    {t('app.newMessages')}
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-accent)]/30" />
                </div>
              )}
              <MessageBubble
                message={msg}
                isSelf={msg.sender_id === myEntityId}
                myEntityId={myEntityId}
                showSender={showSender}
                isRead={readIndicatorMsgId === msg.id}
                replyMessage={msg.reply_to ? messageMap.get(msg.reply_to) : undefined}
                interactionResponse={interactionResponseMap.get(msg.id)}
                onInteractionReply={onInteractionReply}
                onRevoke={onRevoke}
                onReply={onReply}
                onReact={onReact}
                onRetryOutbox={onRetryOutbox}
                onEntitySendMessage={onEntitySendMessage}
                onEntityViewDetails={onEntityViewDetails}
                onScrollToMessage={handleScrollToMessage}
              />
            </div>
          )
        })}

        {/* Inline streaming bubbles */}
        {streams && streams.map((stream) => (
          <StreamingBubble
            key={stream.stream_id}
            stream={stream}
            sender={findEntity(stream.sender_id)}
            onCancel={onCancelStream}
          />
        ))}

        {/* Centered Stop generating button (ChatGPT-style) */}
        {streams && streams.length > 0 && onCancelStream && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => {
                const stream = streams[streams.length - 1]
                onCancelStream(stream.stream_id, stream.conversation_id)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-hover)] transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              {t('chat.stopGenerating')}
            </button>
          </div>
        )}

        {/* Progress indicator (transient, from message.progress events) */}
        {progress && (!streams || streams.length === 0) && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-muted)]">
            <DotsAnimation size="sm" />
            <span>{progress.status?.text || t('chat.processing')}</span>
          </div>
        )}

        {/* Bot thinking indicator */}
        {thinkingEntity && (!streams || streams.length === 0) && !progress && (
          <ThinkingBubble entity={thinkingEntity} />
        )}
      </div>

      <div ref={endRef} />
    </div>
  )
}
