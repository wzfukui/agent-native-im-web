import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InteractionLayer } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Check, X, Send } from 'lucide-react'

interface Props {
  interaction: InteractionLayer
  messageId: number
  onReply: (choice: string, label: string) => void
  disabled?: boolean
}

export function InteractionCard({ interaction, onReply, disabled }: Props) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [responded, setResponded] = useState<string | null>(null)

  const handleReply = (value: string, label: string) => {
    setResponded(label)
    onReply(value, label)
  }

  // Already responded
  if (responded) {
    return (
      <div className="mt-2.5">
        <p className="text-[10px] text-[var(--color-text-muted)] italic">
          {t('interaction.responded', { value: responded })}
        </p>
      </div>
    )
  }

  // Choice type
  if (interaction.type === 'choice') {
    if (!interaction.options?.length) return null
    return (
      <div className="mt-2.5 space-y-2">
        {interaction.prompt && (
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            {interaction.prompt}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {interaction.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleReply(opt.value, opt.label)}
              disabled={disabled}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                'border border-[var(--color-accent)]/40 text-[var(--color-accent-hover)]',
                'hover:bg-[var(--color-accent-dim)] hover:border-[var(--color-accent)]/60',
                'active:scale-[0.97]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Confirm type
  if (interaction.type === 'confirm') {
    return (
      <div className="mt-2.5 space-y-2">
        {interaction.prompt && (
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            {interaction.prompt}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => handleReply('confirmed', t('common.confirm'))}
            disabled={disabled}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
              'active:scale-[0.97]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Check className="w-3 h-3" />
            {t('common.confirm')}
          </button>
          <button
            onClick={() => handleReply('cancelled', t('common.cancel'))}
            disabled={disabled}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              'border border-[var(--color-border)] text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-bg-hover)]',
              'active:scale-[0.97]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <X className="w-3 h-3" />
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  // Form/input type
  if (interaction.type === 'form') {
    return (
      <div className="mt-2.5 space-y-2">
        {interaction.prompt && (
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            {interaction.prompt}
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                handleReply(inputValue.trim(), inputValue.trim())
              }
            }}
            disabled={disabled}
            placeholder={t('interaction.inputPlaceholder')}
            className="flex-1 h-8 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-40"
          />
          <button
            onClick={() => {
              if (inputValue.trim()) handleReply(inputValue.trim(), inputValue.trim())
            }}
            disabled={disabled || !inputValue.trim()}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors',
              'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
