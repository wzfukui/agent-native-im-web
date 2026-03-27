import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import { useConversationsStore } from '@/store/conversations'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { Bot, Zap, Wifi, WifiOff, MessageSquare, Users } from 'lucide-react'

interface Props {
  botMode: boolean
  friendsMode?: boolean
  settingsMode?: boolean
  friendRequestCount?: number
  onToggleBots: () => void
  onToggleFriends?: () => void
  onToggleChat?: () => void
  onToggleSettings?: () => void
}

export function Sidebar({ botMode, friendsMode, settingsMode, friendRequestCount = 0, onToggleBots, onToggleFriends, onToggleChat, onToggleSettings }: Props) {
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
    <nav role="navigation" aria-label={t('a11y.navigation')} className="relative w-[72px] flex flex-col items-center py-5 gap-3 bg-[var(--color-bg-secondary)]/92 backdrop-blur-xl border-r border-[var(--color-border)]">
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--color-border)] to-transparent" />
      {/* Logo */}
      <div className="relative mb-2">
        <div className="absolute inset-0 rounded-2xl bg-[var(--color-accent)]/20 blur-xl" />
        <div className="relative w-11 h-11 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/25">
        <Zap className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Chat with unread badge */}
      <button
        onClick={onToggleChat}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors relative',
          !botMode && !settingsMode
            ? 'bg-[var(--color-accent)]/16 text-[var(--color-accent)] shadow-sm before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[var(--color-accent)]'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
        )}
        title={t('sidebar.messages')}
        aria-label={t('sidebar.messages')}
      >
        <MessageSquare className="w-5 h-5" />
        {totalUnread > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      <button
        onClick={onToggleFriends}
        className={cn(
          'relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors',
          friendsMode
            ? 'bg-[var(--color-success)]/15 text-[var(--color-success)] shadow-sm'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-success)]'
        )}
        title={t('friends.title')}
        aria-label={t('friends.title')}
      >
        <Users className="w-5 h-5" />
        {friendRequestCount > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {friendRequestCount > 99 ? '99+' : friendRequestCount}
          </span>
        )}
      </button>

      {/* Bot manager */}
      <button
        onClick={onToggleBots}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors',
          botMode
            ? 'bg-[var(--color-bot)]/15 text-[var(--color-bot)] shadow-sm'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-bot)]'
        )}
        title={t('sidebar.agents')}
        aria-label={t('sidebar.agents')}
      >
        <Bot className="w-5 h-5" />
      </button>

      {/* User avatar (clickable for settings) */}
      <button
        onClick={onToggleSettings}
        className="relative group cursor-pointer rounded-2xl p-1.5 bg-[var(--color-bg-primary)]/70 border border-[var(--color-border)]"
        title={entityDisplayName(entity)}
        aria-label={t('settings.title')}
      >
        <EntityAvatar entity={entity} size="sm" showStatus />
      </button>

      {/* Connection status */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          wsConnected ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]',
        )}
        role="status"
        aria-label={wsConnected ? t('common.online') : t('common.offline')}
      >
        {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </div>
    </nav>
  )
}
