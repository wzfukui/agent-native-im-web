import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Reply, SmilePlus, Copy, Trash2 } from 'lucide-react'
import type { Message } from '@/lib/types'

interface Props {
  message: Message
  isSelf: boolean
  anchorRect: DOMRect
  onClose: () => void
  onReply?: (msg: Message) => void
  onReact?: (msgId: number, emoji: string) => void
  onRevoke?: (msgId: number) => void
  onCopyText?: (text: string) => void
}

const QUICK_EMOJIS = ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83C\uDF89', '\uD83E\uDD14', '\uD83D\uDC40']
const EXTENDED_EMOJIS = [
  '\uD83D\uDE0A', '\uD83D\uDE0D', '\uD83E\uDD70', '\uD83D\uDE18', '\uD83D\uDE09', '\uD83D\uDE1C', '\uD83E\uDD2A', '\uD83E\uDD29',
  '\uD83D\uDE21', '\uD83D\uDE31', '\uD83E\uDD2F', '\uD83D\uDE22', '\uD83D\uDE2D', '\uD83E\uDD7A', '\uD83D\uDE33', '\uD83D\uDE07',
  '\uD83D\uDC4E', '\u270A', '\uD83D\uDC4A', '\uD83D\uDC4F', '\uD83D\uDE4C', '\uD83E\uDD1D', '\uD83D\uDE4F', '\uD83D\uDCAA',
  '\u2B50', '\uD83D\uDD25', '\uD83D\uDCA5', '\uD83D\uDCAF', '\u2705', '\u274C', '\uD83D\uDE80', '\u2728',
  '\uD83C\uDF39', '\uD83C\uDF3B', '\uD83C\uDF3A', '\uD83C\uDF38', '\uD83C\uDF40', '\uD83C\uDF1E', '\uD83C\uDF19', '\uD83C\uDF08',
]

export function normalizeCopiedMessageText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim()
}

export function MessageActionMenu({ message, isSelf, anchorRect, onClose, onReply, onReact, onRevoke, onCopyText }: Props) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [visible, setVisible] = useState(false)

  const isRevoked = !!message.revoked_at
  // Computed once at mount — message age won't change during the menu's lifetime
  const [canRevoke] = useState(() =>
    isSelf && !isRevoked && !!onRevoke && (Date.now() - new Date(message.created_at).getTime()) < 2 * 60 * 1000
  )
  const canReply = !isRevoked && onReply
  const canReact = !isRevoked && onReact
  const rawTextContent = message.layers?.data?.body as string || message.layers?.summary || ''
  const textContent = normalizeCopiedMessageText(rawTextContent)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Position the menu
  useEffect(() => {
    if (!menuRef.current) return
    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    // Vertical: prefer below the trigger, then flip above if needed.
    let top = anchorRect.bottom + 8
    if (top + rect.height > viewportH - 8) top = anchorRect.top - rect.height - 8
    if (top < 8) top = 8

    // Horizontal: anchor to the explicit trigger instead of centering on the page.
    let left = isSelf ? anchorRect.right - rect.width : anchorRect.left
    if (left < 8) left = 8
    if (left + rect.width > viewportW - 8) left = viewportW - rect.width - 8

    menu.style.top = `${top}px`
    menu.style.left = `${left}px`
  }, [anchorRect, showEmojis])

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent).catch(() => {})
      onCopyText?.(textContent)
    }
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className={cn(
          'fixed z-50 min-w-[180px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden transition-all duration-200',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        )}
        style={{ transformOrigin: isSelf ? 'bottom right' : 'bottom left' }}
      >
        {/* Quick emoji row + expanded grid */}
        {canReact && showEmojis && (
          <div className="border-b border-[var(--color-border)]">
            <div className="flex items-center gap-0.5 px-2 py-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact!(message.id, emoji); onClose() }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-lg cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Extended emoji grid */}
            <div className="grid grid-cols-8 gap-0.5 px-2 pb-2 max-h-[120px] overflow-y-auto">
              {EXTENDED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact!(message.id, emoji); onClose() }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors text-sm cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action items */}
        <div className="py-1">
          {canReply && (
            <button
              onClick={() => { onReply!(message); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors min-h-[44px]"
            >
              <Reply className="w-4 h-4 text-[var(--color-text-muted)]" />
              {t('chat.reply')}
            </button>
          )}
          {canReact && (
            <button
              onClick={() => setShowEmojis(!showEmojis)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors min-h-[44px]"
            >
              <SmilePlus className="w-4 h-4 text-[var(--color-text-muted)]" />
              {t('chat.addReaction')}
            </button>
          )}
          {textContent && (
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors min-h-[44px]"
            >
              <Copy className="w-4 h-4 text-[var(--color-text-muted)]" />
              {t('message.copyText')}
            </button>
          )}
          {canRevoke && (
            <button
              onClick={() => { onRevoke!(message.id); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 cursor-pointer transition-colors min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              {t('message.revoke')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
