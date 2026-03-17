import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface ActionSheetItem {
  key: string
  label: string
  icon?: React.ReactNode
  destructive?: boolean
  onPress: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  items: ActionSheetItem[]
  title?: string
}

export function ActionSheet({ open, onClose, items, title }: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  // Animation sequencing: open -> mount -> animate-in, close -> animate-out -> unmount
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setVisible(true)
        requestAnimationFrame(() => setAnimating(true))
      })
    } else {
      queueMicrotask(() => setAnimating(false))
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          animating ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'relative w-full max-w-lg px-3 pb-3 transition-transform duration-300 ease-out',
          animating ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Action items */}
        <div className="bg-[var(--color-bg-secondary)] rounded-2xl overflow-hidden">
          {title && (
            <div className="px-4 py-3 text-center border-b border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)]">{title}</p>
            </div>
          )}
          {items.map((item, i) => (
            <button
              key={item.key}
              onClick={() => { item.onPress(); onClose() }}
              className={cn(
                'w-full flex items-center justify-center gap-2.5 px-4 py-3.5 text-sm font-medium transition-colors cursor-pointer min-h-[48px]',
                item.destructive
                  ? 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
                i < items.length - 1 && 'border-b border-[var(--color-border)]',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full mt-2 bg-[var(--color-bg-secondary)] rounded-2xl px-4 py-3.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer min-h-[48px]"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
