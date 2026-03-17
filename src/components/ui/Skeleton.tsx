/**
 * Skeleton loading component with animated shimmer effect.
 * Variants: line (text placeholder), circle (avatar), rect (card).
 */
export function Skeleton({ variant = 'line', width, height, className = '' }: {
  variant?: 'line' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  className?: string
}) {
  const base = 'skeleton-shimmer rounded bg-[var(--color-bg-tertiary)]'

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  switch (variant) {
    case 'circle':
      return (
        <div
          className={`${base} rounded-full flex-shrink-0 ${className}`}
          style={{ width: style.width || '32px', height: style.height || '32px', ...style }}
        />
      )
    case 'rect':
      return (
        <div
          className={`${base} rounded-xl ${className}`}
          style={{ width: style.width || '100%', height: style.height || '80px', ...style }}
        />
      )
    default: // line
      return (
        <div
          className={`${base} rounded-md ${className}`}
          style={{ width: style.width || '100%', height: style.height || '12px', ...style }}
        />
      )
  }
}

/** Skeleton for a conversation list item */
export function ConversationItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Skeleton variant="circle" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="line" width="60%" height={12} />
        <Skeleton variant="line" width="80%" height={10} />
      </div>
      <Skeleton variant="line" width={32} height={10} />
    </div>
  )
}

/** Skeleton for a message bubble */
export function MessageBubbleSkeleton({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <div className={`flex gap-2.5 max-w-[70%] ${align === 'right' ? 'ml-auto flex-row-reverse' : ''}`}>
      {align === 'left' && <Skeleton variant="circle" width={32} height={32} />}
      <div className="space-y-1.5 flex-1">
        {align === 'left' && <Skeleton variant="line" width={80} height={10} />}
        <div className="rounded-2xl bg-[var(--color-bg-tertiary)] p-3 space-y-2">
          <Skeleton variant="line" width="90%" height={10} />
          <Skeleton variant="line" width="70%" height={10} />
          <Skeleton variant="line" width="50%" height={10} />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for a bot card */
export function BotCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)]">
      <Skeleton variant="circle" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="line" width="50%" height={12} />
        <Skeleton variant="line" width="70%" height={10} />
        <div className="flex gap-1.5 mt-1">
          <Skeleton variant="line" width={40} height={16} className="rounded-md" />
          <Skeleton variant="line" width={40} height={16} className="rounded-md" />
        </div>
      </div>
    </div>
  )
}
