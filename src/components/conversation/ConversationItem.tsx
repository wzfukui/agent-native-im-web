import { useState } from 'react'
import { cn, entityDisplayName, formatTime, truncate } from '@/lib/utils'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import type { Conversation, Entity } from '@/lib/types'
import { Users, MessageSquare, Pencil, Check, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'

interface Props {
  conv: Conversation
  active: boolean
  myEntityId: number
  onClick: () => void
  onUpdate?: (id: number, title: string) => void
}

export function ConversationItem({ conv, active, myEntityId, onClick, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conv.title || '')
  const [saving, setSaving] = useState(false)
  const token = useAuthStore((s) => s.token)

  const handleEdit = async () => {
    if (!token || !editTitle.trim() || editTitle === conv.title) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      const res = await api.updateConversation(token, conv.id, editTitle.trim())
      if (res.ok && res.data) {
        onUpdate?.(conv.id, editTitle.trim())
      }
    } catch (e) {
      console.error('Failed to update conversation:', e)
    } finally {
      setSaving(false)
      setIsEditing(false)
    }
  }
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
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit()
                  if (e.key === 'Escape') { setIsEditing(false); setEditTitle(conv.title || '') }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 px-1 py-0.5 text-sm bg-[var(--color-bg-input)] border border-[var(--color-accent)] rounded text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit() }}
                disabled={saving}
                className="p-0.5 hover:bg-[var(--color-success)]/20 rounded cursor-pointer"
              >
                <Check className="w-3 h-3 text-[var(--color-success)]" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditTitle(conv.title || '') }}
                className="p-0.5 hover:bg-[var(--color-error)]/20 rounded cursor-pointer"
              >
                <X className="w-3 h-3 text-[var(--color-error)]" />
              </button>
            </div>
          ) : (
            <span className={cn(
              'text-sm font-medium truncate',
              active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]/90',
            )}>
              {title}
            </span>
          )}
          {lastMsg && (
            <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
              {formatTime(lastMsg.created_at)}
            </span>
          )}
          {!isEditing && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditTitle(title); setIsEditing(true) }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-hover)] rounded transition-opacity cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
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
