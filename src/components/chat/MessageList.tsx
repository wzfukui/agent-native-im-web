import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  myEntityId: number
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onInteractionReply?: (msgId: number, choice: string, label: string) => void
  onRevoke?: (msgId: number) => void
}

export function MessageList({ messages, myEntityId, loading, hasMore, onLoadMore, onInteractionReply, onRevoke }: Props) {
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
              Load earlier messages
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-2.5">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.sender_id === myEntityId}
            showSender={shouldShowSender(msg, i)}
            onInteractionReply={onInteractionReply}
            onRevoke={onRevoke}
          />
        ))}
      </div>

      <div ref={endRef} />
    </div>
  )
}
