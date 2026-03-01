import { cn, getInitials, entityColor } from '@/lib/utils'
import type { Entity } from '@/lib/types'
import { usePresenceStore } from '@/store/presence'
import { Bot, User } from 'lucide-react'

interface Props {
  entity?: Entity | null
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  className?: string
}

const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }
const dotSize = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' }

export function EntityAvatar({ entity, size = 'md', showStatus = false, className }: Props) {
  const online = usePresenceStore((s) => entity ? s.online.has(entity.id) : false)
  const color = entityColor(entity)
  const isBot = entity?.entity_type === 'bot' || entity?.entity_type === 'service'

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div
        className={cn(
          sizeMap[size],
          'rounded-full flex items-center justify-center font-semibold select-none',
          isBot ? 'ring-1 ring-[var(--color-bot)]/30' : '',
        )}
        style={{ backgroundColor: color + '22', color }}
      >
        {entity?.avatar_url ? (
          <img src={entity.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : isBot ? (
          <Bot className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4.5 h-4.5'} />
        ) : (
          getInitials(entity?.display_name || entity?.name || '?')
        )}
      </div>
      {showStatus && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[var(--color-bg-secondary)]',
            dotSize[size],
            online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]',
          )}
        />
      )}
    </div>
  )
}
