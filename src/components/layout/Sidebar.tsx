import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { Bot, Bell, Zap, Wifi, WifiOff, MessageSquare, MessagesSquare, UserPlus } from 'lucide-react'

interface Props {
  botMode: boolean
  directMode?: boolean
  groupMode?: boolean
  friendsMode?: boolean
  inboxMode?: boolean
  settingsMode?: boolean
  directUnreadCount?: number
  groupUnreadCount?: number
  friendRequestCount?: number
  notificationCount?: number
  onToggleBots: () => void
  onToggleDirect?: () => void
  onToggleGroups?: () => void
  onToggleFriends?: () => void
  onToggleInbox?: () => void
  onToggleSettings?: () => void
}

export function Sidebar({ botMode, directMode, groupMode, friendsMode, inboxMode, settingsMode, directUnreadCount = 0, groupUnreadCount = 0, friendRequestCount = 0, notificationCount = 0, onToggleBots, onToggleDirect, onToggleGroups, onToggleFriends, onToggleInbox, onToggleSettings }: Props) {
  const { t } = useTranslation()
  const entity = useAuthStore((s) => s.entity)
  const wsConnected = usePresenceStore((s) => s.wsConnected)

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

      {/* Direct chats */}
      <button
        onClick={onToggleDirect}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors relative',
          directMode
            ? 'bg-[var(--color-accent)]/16 text-[var(--color-accent)] shadow-sm before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[var(--color-accent)]'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
        )}
        title={t('conversation.direct')}
        aria-label={t('conversation.direct')}
      >
        <MessageSquare className="w-5 h-5" />
        {directUnreadCount > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {directUnreadCount > 99 ? '99+' : directUnreadCount}
          </span>
        )}
      </button>

      {/* Group chats */}
      <button
        onClick={onToggleGroups}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors relative',
          groupMode
            ? 'bg-[var(--color-accent)]/16 text-[var(--color-accent)] shadow-sm'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
        )}
        title={t('conversation.groups')}
        aria-label={t('conversation.groups')}
      >
        <MessagesSquare className="w-5 h-5" />
        {groupUnreadCount > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {groupUnreadCount > 99 ? '99+' : groupUnreadCount}
          </span>
        )}
      </button>

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
        <UserPlus className="w-5 h-5" />
        {friendRequestCount > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {friendRequestCount > 99 ? '99+' : friendRequestCount}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      <button
        onClick={onToggleInbox}
        className={cn(
          'relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors',
          inboxMode
            ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] shadow-sm'
            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)]'
        )}
        title={t('inbox.title')}
        aria-label={t('inbox.title')}
      >
        <Bell className="w-5 h-5" />
        {notificationCount > 0 && (
          <span aria-live="polite" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {notificationCount > 99 ? '99+' : notificationCount}
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
