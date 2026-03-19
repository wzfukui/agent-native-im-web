import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, entityDisplayName, formatRelativeTime, truncate, isBotOrService } from '@/lib/utils'
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
  const { t, i18n } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conv.title || '')
  const [saving, setSaving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    } catch (e) {
      void e
    } finally {
      setSaving(false)
    }
  }

  const openMenuAt = useCallback((x: number, y: number) => {
    const menuWidth = 180
    const menuHeight = 200

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10
    x = Math.max(10, x)
    y = Math.max(10, y)

    setMenuPos({ x, y })
    setShowMenu(true)
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    openMenuAt(e.clientX, e.clientY)
  }

  // Long-press support for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY
    longPressTimerRef.current = setTimeout(() => {
      openMenuAt(x, y)
    }, 500)
  }, [openMenuAt])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

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
  const lastText = lastMsg?.layers?.summary || (lastMsg?.content_type === 'image' ? '[Image]' : lastMsg?.content_type === 'file' ? '[File]' : lastMsg?.content_type === 'audio' ? '[Audio]' : '')
  const hasUnread = !muted && (conv.unread_count || 0) > 0
  const unreadCount = conv.unread_count || 0

  // Build sender prefix for last message preview
  const lastMsgSenderName = (() => {
    if (!lastMsg?.sender) return ''
    if (lastMsg.sender_id === myEntityId) return i18n.language.startsWith('zh') ? '你' : 'You'
    const name = entityDisplayName(lastMsg.sender)
    // Use first word or first 4 chars for Chinese names
    return name.length > 6 ? name.slice(0, 6) : name
  })()

  return (
    <>
      <button
        onClick={showMenu ? undefined : onClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={cn(
          'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all text-left cursor-pointer group',
          active
            ? 'bg-[var(--color-bg-active)] border-[var(--color-accent)]/25 shadow-lg shadow-black/5'
            : 'bg-[var(--color-bg-secondary)] border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]',
        )}
      >
        {/* Avatar — 40px */}
        {isGroup ? (
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent-dim)] border border-[var(--color-border)] flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            </div>
            {conv.participants?.some((p) => isBotOrService(p.entity)) && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-bot)] border-2 border-[var(--color-bg-secondary)] flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">
                  {conv.participants.filter((p) => isBotOrService(p.entity)).length}
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
            {/* Smart relative time */}
            {lastMsg && (
              <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
                {formatRelativeTime(lastMsg.created_at, i18n.language)}
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
          {/* Last message preview with sender name */}
          {lastText ? (
            <p className={cn('text-xs truncate mt-0.5 leading-relaxed', hasUnread ? 'text-[var(--color-text-secondary)] font-medium' : 'text-[var(--color-text-muted)]')}>
              {lastMsgSenderName && (
                <span className={cn(hasUnread ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]')}>
                  {lastMsgSenderName}:&nbsp;
                </span>
              )}
              {truncate(lastText, 45)}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]/50 mt-0.5">&nbsp;</p>
          )}
        </div>

        {/* Unread badge — red for visibility */}
        {!muted && unreadCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {muted && unreadCount > 0 && (
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)]/50 flex-shrink-0" />
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
          {!isArchived && (
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
