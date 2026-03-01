import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { Bot, LogOut, Zap, Wifi, WifiOff } from 'lucide-react'

interface Props {
  onManageBots: () => void
}

export function Sidebar({ onManageBots }: Props) {
  const entity = useAuthStore((s) => s.entity)
  const logout = useAuthStore((s) => s.logout)
  const wsConnected = usePresenceStore((s) => s.wsConnected)

  return (
    <div className="w-16 flex flex-col items-center py-4 gap-3 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#8b5cf6] flex items-center justify-center shadow-md shadow-[var(--color-accent)]/15 mb-2">
        <Zap className="w-5 h-5 text-white" />
      </div>

      {/* Connection status */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        wsConnected ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]',
      )}>
        {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bot manager */}
      <button
        onClick={onManageBots}
        className="w-10 h-10 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-bot)]"
        title="Manage Agents"
      >
        <Bot className="w-5 h-5" />
      </button>

      {/* User avatar + logout */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative group">
          <EntityAvatar entity={entity} size="sm" showStatus />
        </div>
        <button
          onClick={logout}
          className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
