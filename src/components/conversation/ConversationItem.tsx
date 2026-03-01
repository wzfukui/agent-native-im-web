import { cn, entityDisplayName, formatTime, truncate } from '@/lib/utils'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import type { Conversation, Entity } from '@/lib/types'
import { Users, MessageSquare } from 'lucide-react'

interface Props {
  conv: Conversation
  active: boolean
  myEntityId: number
  onClick: () => void
}

export function ConversationItem({ conv, active, myEntityId, onClick }: Props) {
  const otherParticipant = conv.participants?.find((p) => p.entity_id !== myEntityId)?.entity
  const isGroup = conv.conv_type === 'group' || conv.conv_type === 'channel'
  const displayEntity = isGroup ? null : otherParticipant
  const title = conv.title || entityDisplayName(otherParticipant)
  const lastMsg = conv.last_message
  const lastText = lastMsg?.layers?.summary || (lastMsg?.content_type === 'image' ? '[Image]' : lastMsg?.content_type === 'file' ? '[File]' : '')

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer group',
        active
          ? 'bg-[var(--color-bg-active)] shadow-sm'
          : 'hover:bg-[var(--color-bg-hover)]',
      )}
    >
      {isGroup ? (
        <div className="w-10 h-10 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center flex-shrink-0">
          <Users className="w-4.5 h-4.5 text-[var(--color-accent)]" />
        </div>
      ) : (
        <EntityAvatar entity={displayEntity} size="md" showStatus />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]/90',
          )}>
            {title}
          </span>
          {lastMsg && (
            <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
              {formatTime(lastMsg.created_at)}
            </span>
          )}
        </div>
        {lastText && (
          <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5 leading-relaxed">
            {lastMsg?.sender && lastMsg.sender_id !== myEntityId && (
              <span className="text-[var(--color-text-secondary)]">
                {entityDisplayName(lastMsg.sender).split(' ')[0]}:&nbsp;
              </span>
            )}
            {truncate(lastText, 50)}
          </p>
        )}
      </div>

      {(conv.unread_count || 0) > 0 && (
        <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {conv.unread_count}
        </span>
      )}
    </button>
  )
}
