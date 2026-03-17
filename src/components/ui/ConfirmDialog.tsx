import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/accessibility'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, variant = 'default', onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef as React.RefObject<HTMLElement>, open)
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="w-full max-w-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slide-up 0.2s ease-out' }}
      >
        <div className="px-5 pt-5 pb-4">
          <h3 id="confirm-dialog-title" className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
              variant === 'danger'
                ? 'bg-[var(--color-error)] text-white hover:opacity-90'
                : 'bg-[var(--color-accent)] text-white hover:opacity-90',
            )}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
