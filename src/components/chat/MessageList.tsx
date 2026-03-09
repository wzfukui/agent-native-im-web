import { useEffect, useRef, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import type { Message } from '@/lib/types'
import { formatDateSeparator } from '@/lib/utils'

interface Props {
  messages: Message[]
  myEntityId: number
  loading?: boolean
  hasMore?: boolean
  lastReadMessageId?: number
  onLoadMore?: () => void
  onInteractionReply?: (msgId: number, choice: string, label: string) => void
  onRevoke?: (msgId: number) => void
  onReply?: (msg: Message) => void
  onReact?: (msgId: number, emoji: string) => void
  onRetryOutbox?: (tempId: string) => void
}

export function MessageList({ messages, myEntityId, loading, hasMore, lastReadMessageId, onLoadMore, onInteractionReply, onRevoke, onReply, onReact, onRetryOutbox }: Props) {
  const { t } = useTranslation()
  const endRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      endRef.current?.scrollIntoView({ behavior: messages.length - prevLengthRef.current > 5 ? 'auto' : 'smooth' })
    }
    prevLengthRef.current = messages.length
  }, [messages.length])

  // Initial scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [])

  // Scroll detection for load more
  const handleScroll = () => {
    if (!hasMore || loading || !containerRef.current) return
    if (containerRef.current.scrollTop < 100) {
      onLoadMore?.()
    }
  }

  // Build message map for reply previews
  const messageMap = useMemo(() => {
    const map = new Map<number, Message>()
    for (const msg of messages) map.set(msg.id, msg)
    return map
  }, [messages])

  // Pre-compute date strings for separator checks (avoid repeated new Date() in render)
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
    // Show sender if time gap > 5 minutes
    const gap = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()
    return gap > 300000
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

          // Show new message divider after lastReadMessageId
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
              />
            </div>
          )
        })}
      </div>

      <div ref={endRef} />
    </div>
  )
}
