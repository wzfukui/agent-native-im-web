import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import * as api from '@/lib/api'
import { Bot, LogOut, Zap, Wifi, WifiOff, X, Check, Loader2 } from 'lucide-react'

interface Props {
  onManageBots: () => void
}

export function Sidebar({ onManageBots }: Props) {
  const entity = useAuthStore((s) => s.entity)
  const token = useAuthStore((s) => s.token)!
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const wsConnected = usePresenceStore((s) => s.wsConnected)
  const [showProfile, setShowProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleOpenProfile = () => {
    setEditName(entity?.display_name || '')
    setShowProfile(true)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim() || !entity) return
    setSaving(true)
    const res = await api.updateProfile(token, { display_name: editName.trim() })
    if (res.ok && res.data) {
      setAuth(token, res.data)
    }
    setSaving(false)
    setShowProfile(false)
  }

  return (
    <>
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
          <button
            onClick={handleOpenProfile}
            className="relative group cursor-pointer"
            title={entityDisplayName(entity)}
          >
            <EntityAvatar entity={entity} size="sm" showStatus />
          </button>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile edit modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div
            className="w-full max-w-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Edit Profile</h3>
              <button onClick={() => setShowProfile(false)} className="w-6 h-6 rounded-md hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
                <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            <div className="flex justify-center">
              <EntityAvatar entity={entity} size="lg" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Display Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Username</label>
              <p className="text-sm text-[var(--color-text-muted)] px-1">@{entity?.name}</p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving || !editName.trim()}
              className="w-full h-9 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      )}
    </>
  )
}
