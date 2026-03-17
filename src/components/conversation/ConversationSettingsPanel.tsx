import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { usePresenceStore } from '@/store/presence'
import { AgentConfigSection } from '@/components/conversation/AgentConfigSection'
import { MemorySection } from '@/components/conversation/MemorySection'
import { InviteLinkSection } from '@/components/conversation/InviteLinkSection'
import * as api from '@/lib/api'
import type { Conversation } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  X, UserMinus, Bell, BellOff, Crown, Shield, Eye,
  Pencil, Check, LogOut, Archive, VolumeX, Volume2, Loader2, Copy, ArrowLeft,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  conversation: Conversation
  onClose: () => void
  onLeave?: () => void
  isArchived?: boolean
}

export function ConversationSettingsPanel({ conversation, onClose, onLeave, isArchived }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const toggleMute = useConversationsStore((s) => s.toggleMute)
  const isMuted = useConversationsStore((s) => s.isMuted)
  const online = usePresenceStore((s) => s.online)

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleValue, setTitleValue] = useState(conversation.title || '')
  const [descValue, setDescValue] = useState(conversation.description || '')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null)
  const [idCopied, setIdCopied] = useState(false)
  const [idCopyError, setIdCopyError] = useState<string | null>(null)
  const publicId = (conversation.metadata as Record<string, unknown> | undefined)?.public_id
  const displayConversationId = (typeof publicId === 'string' && publicId) || conversation.public_id || String(conversation.id)

  const participants = conversation.participants || []
  const myParticipant = participants.find((p) => p.entity_id === myEntity.id)
  const canManage = myParticipant?.role === 'owner' || myParticipant?.role === 'admin'
  const isGroup = conversation.conv_type === 'group' || conversation.conv_type === 'channel'
  const muted = isMuted(conversation.id)

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === conversation.title) {
      setEditingTitle(false)
      return
    }
    setSaving(true)
    const res = await api.updateConversation(token, conversation.id, { title: titleValue.trim() })
    if (res.ok && res.data) {
      updateConversation(conversation.id, { title: res.data.title })
    }
    setSaving(false)
    setEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    if (descValue === conversation.description) {
      setEditingDesc(false)
      return
    }
    setSaving(true)
    const res = await api.updateConversation(token, conversation.id, { description: descValue.trim() })
    if (res.ok && res.data) {
      updateConversation(conversation.id, { description: res.data.description })
    }
    setSaving(false)
    setEditingDesc(false)
  }

  const handleSubscriptionChange = async (mode: string) => {
    await api.updateSubscription(token, conversation.id, mode)
  }

  const handleLeave = async () => {
    setLoading(true)
    const res = await api.leaveConversation(token, conversation.id)
    setLoading(false)
    if (res.ok) {
      onLeave?.()
      onClose()
    }
  }

  const handleArchive = async () => {
    setLoading(true)
    const res = await api.archiveConversation(token, conversation.id)
    setLoading(false)
    if (res.ok) {
      onLeave?.()
      onClose()
    }
  }

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-amber-400" />
    if (role === 'admin') return <Shield className="w-3 h-3 text-blue-400" />
    if (role === 'observer') return <Eye className="w-3 h-3 text-[var(--color-text-muted)]" />
    return null
  }

  return (
    <div className={cn(
      'border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col h-full overflow-hidden flex-shrink-0',
      isMobile ? 'fixed inset-0 z-50 w-full border-l-0' : 'w-80',
    )} style={isMobile ? { animation: 'slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1)' } : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
          )}
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t('settings.title')}{isArchived && <span className="text-xs text-[var(--color-text-muted)] ml-2">({t('common.archived')})</span>}
          </h3>
        </div>
        {!isMobile && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.name')}</label>
          {editingTitle ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                className="flex-1 h-8 px-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-accent)]/50 text-sm text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
              />
              <button onClick={handleSaveTitle} disabled={saving} className="p-1 hover:bg-[var(--color-success)]/20 rounded cursor-pointer">
                <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-1 hover:bg-[var(--color-error)]/20 rounded cursor-pointer">
                <X className="w-3.5 h-3.5 text-[var(--color-error)]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1 group">
              <p className="text-sm text-[var(--color-text-primary)] flex-1">{conversation.title || 'Untitled'}</p>
              {canManage && !isArchived && (
                <button onClick={() => { setTitleValue(conversation.title || ''); setEditingTitle(true) }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-opacity">
                  <Pencil className="w-3 h-3 text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Conversation ID */}
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.conversationId')}</label>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-[var(--color-text-secondary)] font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
              {displayConversationId}
            </code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(displayConversationId)
                  setIdCopyError(null)
                  setIdCopied(true)
                  setTimeout(() => setIdCopied(false), 2000)
                } catch {
                  setIdCopied(false)
                  setIdCopyError(t('common.copyFailed'))
                }
              }}
              className="p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-colors"
              title={t('settings.conversationId')}
            >
              {idCopied
                ? <Check className="w-3 h-3 text-[var(--color-success)]" />
                : <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />
              }
            </button>
            {idCopied && <span className="text-[10px] text-[var(--color-success)]">{t('settings.idCopied')}</span>}
            {idCopyError && <span className="text-[10px] text-red-400">{idCopyError}</span>}
          </div>
        </div>

        {/* Description */}
        {isGroup && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.description')}</label>
            {editingDesc ? (
              <div className="mt-1 space-y-1">
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-accent)]/50 text-xs text-[var(--color-text-primary)] focus:outline-none resize-none"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button onClick={handleSaveDesc} disabled={saving} className="px-2 py-1 text-[10px] bg-[var(--color-accent)] text-white rounded cursor-pointer">{t('common.save')}</button>
                  <button onClick={() => setEditingDesc(false)} className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-1 group">
                <p className="text-xs text-[var(--color-text-secondary)] flex-1 leading-relaxed">
                  {conversation.description || t('settings.noDescription')}
                </p>
                {canManage && !isArchived && (
                  <button onClick={() => { setDescValue(conversation.description || ''); setEditingDesc(true) }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-opacity flex-shrink-0">
                    <Pencil className="w-3 h-3 text-[var(--color-text-muted)]" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Agent config (prompt editing) */}
        <AgentConfigSection conversationId={conversation.id} canManage={canManage && !isArchived} />

        {/* Memory section */}
        <MemorySection conversationId={conversation.id} canManage={canManage && !isArchived} />

        {/* Invite links (owner/admin only) */}
        {canManage && isGroup && !isArchived && (
          <InviteLinkSection conversationId={conversation.id} />
        )}

        {/* Notification settings */}
        {myParticipant && (
          <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-3">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.notifications')}</label>

            {/* Mute toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{t('settings.mute')}</span>
              </div>
              <button
                onClick={() => toggleMute(conversation.id)}
                disabled={isArchived}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors relative',
                  muted ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                  isArchived ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-all',
                  muted ? 'left-[18px]' : 'left-0.5',
                )} />
              </button>
            </div>

            {/* Subscription mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {myParticipant.subscription_mode === 'subscribe_all' || myParticipant.subscription_mode === 'mention_with_context'
                  ? <Bell className="w-3.5 h-3.5" />
                  : <BellOff className="w-3.5 h-3.5" />}
                <span>{t('settings.mode')}</span>
              </div>
              <select
                value={myParticipant.subscription_mode}
                onChange={(e) => handleSubscriptionChange(e.target.value)}
                disabled={isArchived}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]/50",
                  isArchived ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <option value="mention_only">{t('settings.mentionOnly')}</option>
                <option value="subscribe_all">{t('settings.allMessages')}</option>
                <option value="mention_with_context">{t('settings.mentionContext')}</option>
                <option value="subscribe_digest">{t('settings.digest')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {t('settings.members')} ({participants.length})
          </label>
          <div className="mt-2 space-y-1">
            {participants.map((p) => (
              <div key={p.entity_id} className="flex items-center gap-2.5 py-1.5 group">
                <div className="relative">
                  <EntityAvatar entity={p.entity} size="xs" />
                  {online.has(p.entity_id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-bg-secondary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {roleIcon(p.role)}
                    <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {entityDisplayName(p.entity)}
                    </span>
                    {p.entity_id === myEntity.id && (
                      <span className="text-[9px] text-[var(--color-text-muted)]">{t('common.you')}</span>
                    )}
                  </div>
                </div>
                {canManage && p.entity_id !== myEntity.id && p.role !== 'owner' && !isArchived && (
                  <select
                    value={p.role}
                    onChange={(e) => api.updateParticipantRole(token, conversation.id, p.entity_id, e.target.value)}
                    className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-pointer focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <option value="admin">{t('settings.roleAdmin')}</option>
                    <option value="member">{t('settings.roleMember')}</option>
                    <option value="observer">{t('settings.roleObserver')}</option>
                  </select>
                )}
                {canManage && p.entity_id !== myEntity.id && p.role !== 'owner' && !isArchived && (
                  <button
                    onClick={() => setRemoveMemberId(p.entity_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-error)]/15 rounded cursor-pointer transition-opacity"
                  >
                    <UserMinus className="w-3 h-3 text-[var(--color-text-muted)]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 space-y-1">
          {isGroup && !isArchived && (
            <button
              onClick={handleArchive}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              {t('settings.archive')}
            </button>
          )}
          {isGroup && myParticipant?.role !== 'owner' && !isArchived && (
            <button
              onClick={() => setConfirmLeave(true)}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 cursor-pointer transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              {t('settings.leave')}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title={t('settings.leave')}
        message={t('settings.leaveConfirm')}
        variant="danger"
        confirmLabel={t('settings.leave')}
        onConfirm={() => { setConfirmLeave(false); handleLeave() }}
        onCancel={() => setConfirmLeave(false)}
      />

      <ConfirmDialog
        open={removeMemberId !== null}
        title={t('common.removeMember')}
        message={t('settings.removeMemberConfirm', { name: entityDisplayName(participants.find((p) => p.entity_id === removeMemberId)?.entity) })}
        variant="danger"
        confirmLabel={t('common.removeMember')}
        onConfirm={async () => {
          if (removeMemberId !== null) {
            await api.removeParticipant(token, conversation.id, removeMemberId)
          }
          setRemoveMemberId(null)
        }}
        onCancel={() => setRemoveMemberId(null)}
      />
    </div>
  )
}
