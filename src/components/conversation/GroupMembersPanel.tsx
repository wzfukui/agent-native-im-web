import { useState, useEffect } from 'react'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import type { Conversation, Participant, Entity } from '@/lib/types'
import { X, UserPlus, UserMinus, Bell, BellOff, Crown, Shield, Loader2 } from 'lucide-react'

interface Props {
  conversation: Conversation
  onClose: () => void
  onUpdate?: () => void
}

export function GroupMembersPanel({ conversation, onClose, onUpdate }: Props) {
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const [showAddMember, setShowAddMember] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)

  const participants = conversation.participants || []
  const myParticipant = participants.find((p) => p.entity_id === myEntity.id)
  const canManage = myParticipant?.role === 'owner' || myParticipant?.role === 'admin'

  // Load entities for adding members
  useEffect(() => {
    if (!showAddMember) return
    api.listEntities(token).then((res) => {
      if (res.ok && res.data) {
        const existing = new Set(participants.map((p) => p.entity_id))
        setEntities((res.data as Entity[]).filter((e) => !existing.has(e.id)))
      }
    })
  }, [showAddMember, token])

  const handleAdd = async (entityId: number) => {
    setLoading(true)
    await api.addParticipant(token, conversation.id, entityId, 'member')
    setLoading(false)
    setShowAddMember(false)
    onUpdate?.()
  }

  const handleRemove = async (entityId: number) => {
    if (!confirm('确定移除该成员？')) return
    setLoading(true)
    await api.removeParticipant(token, conversation.id, entityId)
    setLoading(false)
    onUpdate?.()
  }

  const handleSubscriptionChange = async (mode: string) => {
    if (!myParticipant) return
    await api.updateSubscription(token, conversation.id, mode)
    onUpdate?.()
  }

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-amber-400" />
    if (role === 'admin') return <Shield className="w-3 h-3 text-blue-400" />
    return null
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-amber-400/15 text-amber-400',
      admin: 'bg-blue-400/15 text-blue-400',
      member: 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]',
    }
    return (
      <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium uppercase', colors[role] || colors.member)}>
        {role}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Group Members</h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{participants.length} participants</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* My subscription mode */}
        {myParticipant && (
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] flex-shrink-0">
              {myParticipant.subscription_mode === 'subscribe_all' || myParticipant.subscription_mode === 'mention_with_context'
                ? <Bell className="w-3.5 h-3.5" />
                : <BellOff className="w-3.5 h-3.5" />
              }
              <span>Notifications</span>
            </div>
            <select
              value={myParticipant.subscription_mode}
              onChange={(e) => handleSubscriptionChange(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-md bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer focus:outline-none focus:border-[var(--color-accent)]/50"
            >
              <option value="mention_only">Only @mentioned</option>
              <option value="subscribe_all">All messages</option>
              <option value="mention_with_context">@mentioned + context</option>
              <option value="subscribe_digest">Digest (poll)</option>
            </select>
          </div>
        )}

        {/* Members list */}
        <div className="max-h-72 overflow-y-auto">
          {participants.map((p) => (
            <div key={p.entity_id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-bg-hover)] transition-colors">
              <EntityAvatar entity={p.entity} size="sm" showStatus />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {roleIcon(p.role)}
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {entityDisplayName(p.entity)}
                  </span>
                  {p.entity_id === myEntity.id && (
                    <span className="text-[9px] text-[var(--color-text-muted)]">(you)</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[var(--color-text-muted)]">@{p.entity?.name}</span>
                  {roleBadge(p.role)}
                </div>
              </div>
              {canManage && p.entity_id !== myEntity.id && p.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(p.entity_id)}
                  className="w-7 h-7 rounded-lg hover:bg-[var(--color-error)]/15 flex items-center justify-center cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove member"
                >
                  <UserMinus className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add member */}
        {canManage && (
          <div className="border-t border-[var(--color-border)]">
            {showAddMember ? (
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {loading && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin" />
                  </div>
                )}
                {entities.length === 0 && !loading && (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-2">No available entities</p>
                )}
                {entities.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => handleAdd(e.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors text-left"
                  >
                    <EntityAvatar entity={e} size="xs" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[var(--color-text-primary)] truncate block">{entityDisplayName(e)}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">@{e.name} · {e.entity_type}</span>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setShowAddMember(false)}
                  className="w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] py-1 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full flex items-center justify-center gap-1.5 px-5 py-3 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
