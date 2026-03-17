/**
 * Reusable skeleton loading screen component.
 * Renders pre-composed skeleton layouts that match the real content structure,
 * providing a smooth perceived loading experience (like Discord/Telegram).
 *
 * Uses the existing Skeleton primitives and CSS shimmer animation.
 */
import { ConversationItemSkeleton, MessageBubbleSkeleton, BotCardSkeleton } from './Skeleton'

type Variant = 'conversation-list' | 'chat-messages' | 'bot-list'

interface Props {
  variant: Variant
  /** Number of skeleton items to render (overrides default per variant) */
  count?: number
  className?: string
}

const MESSAGE_ALIGNS: Array<'left' | 'right'> = ['left', 'right', 'left', 'left', 'right', 'left']

export function SkeletonLoader({ variant, count, className = '' }: Props) {
  switch (variant) {
    case 'conversation-list': {
      const n = count ?? 7
      return (
        <div className={`space-y-0.5 ${className}`}>
          {Array.from({ length: n }).map((_, i) => (
            <ConversationItemSkeleton key={i} />
          ))}
        </div>
      )
    }

    case 'chat-messages': {
      const n = count ?? 6
      return (
        <div className={`flex-1 overflow-hidden px-4 py-3 space-y-4 ${className}`}>
          {Array.from({ length: n }).map((_, i) => (
            <MessageBubbleSkeleton key={i} align={MESSAGE_ALIGNS[i % MESSAGE_ALIGNS.length]} />
          ))}
        </div>
      )
    }

    case 'bot-list': {
      const n = count ?? 5
      return (
        <div className={`grid grid-cols-1 gap-2 ${className}`}>
          {Array.from({ length: n }).map((_, i) => (
            <BotCardSkeleton key={i} />
          ))}
        </div>
      )
    }
  }
}
