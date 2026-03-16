import { useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageBubble } from './MessageBubble'
import { StreamingBubble } from './StreamingBubble'
import { ThinkingBubble } from './ThinkingBubble'
import { DotsAnimation } from '@/components/ui/DotsAnimation'
import { Loader2 } from 'lucide-react'
import type { Message, ActiveStream, Entity } from '@/lib/types'
import type { ProgressEntry } from '@/store/messages'
import { formatDateSeparator } from '@/lib/utils'

interface Props {
  messages: Message[]
  myEntityId: number
  loading?: boolean
  hasMore?: boolean
  lastReadMessageId?: number
  streams?: ActiveStream[]
  participants?: { entity_id: number; entity?: Entity }[]
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

export function MessageList({ messages, myEntityId, loading, hasMore, lastReadMessageId, streams, participants, onLoadMore, onInteractionReply, onRevoke, onReply, onReact, onRetryOutbox, onCancelStream, onEntitySendMessage, onEntityViewDetails, thinkingEntity, progress }: Props) {
  const { t } = useTranslation()
  const endRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)
  const isNearBottomRef = useRef(true)

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
  }, [streamContent, streams?.length])

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
      className="flex-1 overflow-y-auto px-4 py-3"
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
      <div className="space-y-2.5">
        {messages.map((msg, i) => {
          const showDateSep = dateSepIndices.has(i)
          const showDivider = lastReadMessageId != null &&
            i > 0 &&
            messages[i - 1].id === lastReadMessageId &&
            msg.id !== lastReadMessageId &&
            msg.sender_id !== myEntityId

          return (
            <div key={msg.id}>
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
                showSender={shouldShowSender(msg, i)}
                replyMessage={msg.reply_to ? messageMap.get(msg.reply_to) : undefined}
                onInteractionReply={onInteractionReply}
                onRevoke={onRevoke}
                onReply={onReply}
                onReact={onReact}
                onRetryOutbox={onRetryOutbox}
                onEntitySendMessage={onEntitySendMessage}
                onEntityViewDetails={onEntityViewDetails}
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
