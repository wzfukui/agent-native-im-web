import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, entityDisplayName, formatTime, truncate } from '@/lib/utils'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { useConversationsStore } from '@/store/conversations'
import type { Conversation } from '@/lib/types'
import { Users, Pencil, Check, X, VolumeX, LogOut, Archive, Pin, PinOff } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'

interface Props {
  conv: Conversation
  active: boolean
  myEntityId: number
  onClick: () => void
  onUpdate?: (id: number, title: string) => void
  onLeave?: (id: number) => void
  onArchive?: (id: number) => void
  onUnarchive?: (id: number) => void
  onPin?: (id: number) => void
  onUnpin?: (id: number) => void
  isArchived?: boolean
}

export function ConversationItem({ conv, active, myEntityId, onClick, onUpdate, onLeave, onArchive, onUnarchive, onPin, onUnpin, isArchived }: Props) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conv.title || '')
  const [saving, setSaving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const token = useAuthStore((s) => s.token)
  const toggleMute = useConversationsStore((s) => s.toggleMute)
  const isMuted = useConversationsStore((s) => s.isMuted)
  const muted = isMuted(conv.id)
  const isGroup = conv.conv_type === 'group' || conv.conv_type === 'channel'
  const myParticipant = conv.participants?.find((p) => p.entity_id === myEntityId)

  const handleEdit = async () => {
    if (!token || !editTitle.trim() || editTitle === conv.title) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      const res = await api.updateConversation(token, conv.id, { title: editTitle.trim() })
      if (res.ok && res.data) {
        onUpdate?.(conv.id, editTitle.trim())
        setIsEditing(false)
      }
      // If failed, keep edit mode open so user doesn't lose input
    } catch (e) {
      void e
    } finally {
      setSaving(false)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    // Calculate position with viewport boundary detection
    const menuWidth = 180 // approximate menu width
    const menuHeight = 200 // approximate max menu height

    let x = e.clientX
    let y = e.clientY

    // Check right boundary
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }

    // Check bottom boundary
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }

    // Ensure minimum offset from edges
    x = Math.max(10, x)
    y = Math.max(10, y)

    setMenuPos({ x, y })
    setShowMenu(true)
  }

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const otherParticipant = conv.participants?.find((p) => p.entity_id !== myEntityId)?.entity
  const displayEntity = isGroup ? null : otherParticipant
  const title = conv.title || entityDisplayName(otherParticipant)
  const lastMsg = conv.last_message
  const lastText = lastMsg?.layers?.summary || (lastMsg?.content_type === 'image' ? '[Image]' : lastMsg?.content_type === 'file' ? '[File]' : '')
  const hasUnread = !muted && (conv.unread_count || 0) > 0

  return (
    <>
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer group',
          active
            ? 'bg-[var(--color-bg-active)] shadow-sm'
            : 'hover:bg-[var(--color-bg-hover)]',
          hasUnread && !active && 'border-l-2 border-[var(--color-accent)]',
        )}
      >
        {isGroup ? (
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            </div>
            {/* Agent indicator dot */}
            {conv.participants?.some((p) => p.entity?.entity_type === 'bot' || p.entity?.entity_type === 'service') && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-bot)] border-2 border-[var(--color-bg-secondary)] flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">
                  {conv.participants.filter((p) => p.entity?.entity_type === 'bot' || p.entity?.entity_type === 'service').length}
                </span>
              </div>
            )}
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
                'text-sm truncate flex items-center gap-1',
                hasUnread ? 'font-semibold text-[var(--color-text-primary)]' : 'font-medium',
                !hasUnread && (active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]/90'),
              )}>
                {title}
                {myParticipant?.pinned_at && <Pin className="w-3 h-3 text-[var(--color-accent)] flex-shrink-0" />}
                {muted && <VolumeX className="w-3 h-3 text-[var(--color-text-muted)] flex-shrink-0" />}
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
            <p className={cn('text-xs truncate mt-0.5 leading-relaxed', hasUnread ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]')}>
              {lastMsg?.sender && lastMsg.sender_id !== myEntityId && (
                <span className="text-[var(--color-text-secondary)]">
                  {entityDisplayName(lastMsg.sender).split(' ')[0]}:&nbsp;
                </span>
              )}
              {truncate(lastText, 50)}
            </p>
          )}
        </div>

        {!muted && (conv.unread_count || 0) > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {(conv.unread_count || 0) > 99 ? '99+' : conv.unread_count}
          </span>
        )}
        {muted && (conv.unread_count || 0) > 0 && (
          <span className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] flex-shrink-0" />
        )}
      </button>

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/20"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {!isArchived && (myParticipant?.pinned_at ? (
            <button
              onClick={() => { setShowMenu(false); onUnpin?.(conv.id) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
            >
              <PinOff className="w-3.5 h-3.5" />
              {t('conversation.unpin')}
            </button>
          ) : (
            <button
              onClick={() => { setShowMenu(false); onPin?.(conv.id) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
            >
              <Pin className="w-3.5 h-3.5" />
              {t('conversation.pin')}
            </button>
          ))}
          <button
            onClick={() => { toggleMute(conv.id); setShowMenu(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
          >
            <VolumeX className="w-3.5 h-3.5" />
            {muted ? t('common.unmute') : t('settings.mute')}
          </button>
          {isGroup && !isArchived && (
            <button
              onClick={() => { setShowMenu(false); onArchive?.(conv.id) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              {t('conversation.archive')}
            </button>
          )}
          {isArchived && (
            <button
              onClick={() => { setShowMenu(false); onUnarchive?.(conv.id) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              {t('conversation.unarchive')}
            </button>
          )}
          {isGroup && myParticipant?.role !== 'owner' && (
            <button
              onClick={() => { setShowMenu(false); onLeave?.(conv.id) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('conversation.leave')}
            </button>
          )}
        </div>
      )}
    </>
  )
}
