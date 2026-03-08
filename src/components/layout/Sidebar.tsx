import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import { useConversationsStore } from '@/store/conversations'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { Bot, Zap, Wifi, WifiOff, Shield, MessageSquare } from 'lucide-react'

interface Props {
  botMode: boolean
  adminMode?: boolean
  settingsMode?: boolean
  isAdmin?: boolean
  onToggleBots: () => void
  onToggleAdmin?: () => void
  onToggleChat?: () => void
  onToggleSettings?: () => void
}

export function Sidebar({ botMode, adminMode, settingsMode, isAdmin, onToggleBots, onToggleAdmin, onToggleChat, onToggleSettings }: Props) {
  const { t } = useTranslation()
  const entity = useAuthStore((s) => s.entity)
  const wsConnected = usePresenceStore((s) => s.wsConnected)
  const conversations = useConversationsStore((s) => s.conversations)
  const mutedIds = useConversationsStore((s) => s.mutedIds)

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => {
      if (mutedIds.has(c.id)) return sum
      return sum + (c.unread_count || 0)
    }, 0)
  }, [conversations, mutedIds])

  return (
    <div className="w-16 flex flex-col items-center py-4 gap-3 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]">
      {/* Logo — solid, no gradient */}
      <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center mb-2">
        <Zap className="w-5 h-5 text-white" />
      </div>

      {/* Chat with unread badge */}
      <button
        onClick={onToggleChat}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors relative',
          !botMode && !adminMode && !settingsMode
            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[var(--color-accent)]'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
        )}
        title={t('sidebar.messages')}
      >
        <MessageSquare className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bot manager */}
      <button
        onClick={onToggleBots}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors',
          botMode
            ? 'bg-[var(--color-bot)]/15 text-[var(--color-bot)]'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-bot)]'
        )}
        title={t('sidebar.agents')}
      >
        <Bot className="w-5 h-5" />
      </button>

      {/* Admin panel */}
      {isAdmin && (
        <button
          onClick={onToggleAdmin}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors',
            adminMode
              ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]'
              : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)]'
          )}
          title={t('sidebar.admin')}
        >
          <Shield className="w-5 h-5" />
        </button>
      )}

      {/* User avatar (clickable for settings) */}
      <button
        onClick={onToggleSettings}
        className="relative group cursor-pointer"
        title={entityDisplayName(entity)}
      >
        <EntityAvatar entity={entity} size="sm" showStatus />
      </button>

      {/* Connection status */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        wsConnected ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]',
      )}>
        {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </div>
    </div>
  )
}
