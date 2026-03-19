import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { EntityAvatar } from './EntityAvatar'
import { cn, entityDisplayName, entityColor, isBotOrService, formatTime } from '@/lib/utils'
import type { Entity } from '@/lib/types'
import { usePresenceStore } from '@/store/presence'
import { getEntityPresenceSemantic, getEntityStatusLabel } from '@/lib/entity-status'
import { Bot, User, MessageSquare, ExternalLink, X } from 'lucide-react'

interface Props {
  entity: Entity
  anchorRect: DOMRect
  onClose: () => void
  onSendMessage?: (entity: Entity) => void
  onViewDetails?: (entity: Entity) => void
}

export function EntityPopoverCard({ entity, anchorRect, onClose, onSendMessage, onViewDetails }: Props) {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const isBot = isBotOrService(entity)
  const color = entityColor(entity)
  const isOnline = usePresenceStore((s) => s.online.has(entity.id))
  const description = entity.metadata?.description as string | undefined

  // Position the popover relative to the anchor (layout effect to avoid flicker)
   
  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return

    const cardRect = card.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const gap = 8

    // Default: below and to the right of the avatar
    let top = anchorRect.bottom + gap
    let left = anchorRect.left

    // If overflows right, shift left
    if (left + cardRect.width > viewportW - 16) {
      left = viewportW - cardRect.width - 16
    }

    // If overflows bottom, show above the avatar
    if (top + cardRect.height > viewportH - 16) {
      top = anchorRect.top - cardRect.height - gap
    }

    // Clamp
    left = Math.max(16, left)
    top = Math.max(16, top)

    queueMicrotask(() => setPosition({ top, left }))
  }, [anchorRect])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on scroll (any scrollable parent)
  useEffect(() => {
    const handleScroll = () => onClose()
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [onClose])

  const typeBadge = entity.entity_type === 'bot'
    ? t('entityPopover.bot')
    : entity.entity_type === 'service'
      ? t('entityPopover.service')
      : t('entityPopover.user')

  const statusSemantic = getEntityPresenceSemantic(entity, isOnline)
  const statusText = getEntityStatusLabel(t, entity, isOnline)

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Card */}
      <div
        ref={cardRef}
        className="fixed z-50 w-[280px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl"
        style={{
          top: position.top,
          left: position.left,
          animation: 'fade-in 0.15s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div
          className="h-16 rounded-t-xl relative"
          style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-bg-secondary)]/80 flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Avatar (overlapping banner) */}
        <div className="px-4 -mt-7">
          <div className="w-14 h-14 rounded-full border-[3px] border-[var(--color-bg-secondary)]">
            <EntityAvatar entity={entity} size="lg" />
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pt-2 pb-3">
          {/* Name + type badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {entityDisplayName(entity)}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
              isBot
                ? 'bg-[var(--color-bot)]/15 text-[var(--color-bot)]'
                : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
            )}>
              {isBot ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
              {typeBadge}
            </span>
          </div>

          {/* Username */}
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            @{entity.name}
          </p>

          {/* Description */}
          {description && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed line-clamp-3">
              {description}
            </p>
          )}

          {/* Status + Created */}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                statusSemantic === 'disabled' || statusSemantic === 'pending'
                  ? 'bg-[var(--color-warning)]'
                  : statusSemantic === 'online'
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-text-muted)]',
              )} />
              {statusText}
            </span>
            <span>{t('entityPopover.joined')} {formatTime(entity.created_at)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--color-border)]" />

        {/* Actions */}
        <div className="px-3 py-2.5 flex items-center gap-2">
          {onSendMessage && (
            <button
              onClick={() => { onSendMessage(entity); onClose() }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              {t('entityPopover.sendMessage')}
            </button>
          )}
          {isBot && onViewDetails && (
            <button
              onClick={() => { onViewDetails(entity); onClose() }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              {t('entityPopover.viewDetails')}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
