import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useConversationsStore } from '@/store/conversations'
import { MessageSquare, Bot, Settings2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MobileTab = 'chat' | 'friends' | 'bots' | 'settings'

interface Props {
  activeTab: MobileTab
  friendRequestCount?: number
  onTabChange: (tab: MobileTab) => void
}

export function MobileTabBar({ activeTab, friendRequestCount = 0, onTabChange }: Props) {
  const { t } = useTranslation()
  const conversations = useConversationsStore((s) => s.conversations)
  const mutedIds = useConversationsStore((s) => s.mutedIds)

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => {
      if (mutedIds.has(c.id)) return sum
      return sum + (c.unread_count || 0)
    }, 0)
  }, [conversations, mutedIds])

  const tabs: { key: MobileTab; icon: typeof MessageSquare; label: string; badge?: number }[] = [
    { key: 'chat', icon: MessageSquare, label: t('sidebar.messages'), badge: totalUnread },
    { key: 'friends', icon: Users, label: t('friends.title'), badge: friendRequestCount },
    { key: 'bots', icon: Bot, label: t('sidebar.agents') },
    { key: 'settings', icon: Settings2, label: t('settings.title') },
  ]

  return (
    <nav role="navigation" aria-label={t('a11y.navigation')} className="mobile-tab-bar flex items-end justify-around bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ key, icon: Icon, label, badge }) => {
        const active = activeTab === key
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-4 min-w-0 flex-1 cursor-pointer transition-colors relative',
              active
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)]',
            )}
            aria-label={label}
          >
            <span className="relative">
              <Icon className="w-5 h-5" />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium leading-tight truncate max-w-full">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
