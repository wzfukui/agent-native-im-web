import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InteractionLayer, Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Check, X, Send } from 'lucide-react'

interface Props {
  interaction: InteractionLayer
  messageId: number
  onReply: (choice: string, label: string) => void
  disabled?: boolean
  responseMessage?: Message
}

function getInteractionReplyLabel(message?: Message): string | null {
  if (!message) return null
  const summary = message.layers?.summary
  if (typeof summary === 'string' && summary.trim()) return summary.trim()
  const reply = message.layers?.data?.interaction_reply as { choice?: string; value?: string } | undefined
  if (typeof reply?.choice === 'string' && reply.choice.trim()) return reply.choice.trim()
  if (typeof reply?.value === 'string' && reply.value.trim()) return reply.value.trim()
  return null
}

export function InteractionCard({ interaction, onReply, disabled, responseMessage }: Props) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const responseLabel = getInteractionReplyLabel(responseMessage)
  const responseState = responseMessage?.client_state
  const isResponded = !!responseMessage && responseState !== 'failed'
  const isPending = responseState === 'sending' || responseState === 'queued'
  const canSubmit = !disabled && !isPending && !isResponded

  const handleReply = (value: string, label: string) => onReply(value, label)

  if (isResponded && responseLabel) {
    return (
      <div className="mt-2.5">
        <p className="text-[10px] text-[var(--color-text-muted)] italic">
          {t('interaction.responded', { value: responseLabel })}
        </p>
      </div>
    )
  }

  // Choice type
  if (interaction.type === 'choice') {
    if (!interaction.options?.length) return null
    return (
      <div className="mt-2.5 space-y-2">
        <p className={cn(
          'text-[10px] font-medium',
          isPending ? 'text-[var(--color-accent)]' : responseState === 'failed' ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]',
        )}>
          {isPending ? t('interaction.responding') : responseState === 'failed' ? t('interaction.responseFailed') : t('interaction.awaiting')}
        </p>
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
              disabled={!canSubmit}
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
        <p className={cn(
          'text-[10px] font-medium',
          isPending ? 'text-[var(--color-accent)]' : responseState === 'failed' ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]',
        )}>
          {isPending ? t('interaction.responding') : responseState === 'failed' ? t('interaction.responseFailed') : t('interaction.awaiting')}
        </p>
        {interaction.prompt && (
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            {interaction.prompt}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => handleReply('confirmed', t('common.confirm'))}
            disabled={!canSubmit}
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
            disabled={!canSubmit}
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
        <p className={cn(
          'text-[10px] font-medium',
          isPending ? 'text-[var(--color-accent)]' : responseState === 'failed' ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]',
        )}>
          {isPending ? t('interaction.responding') : responseState === 'failed' ? t('interaction.responseFailed') : t('interaction.awaiting')}
        </p>
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
            disabled={!canSubmit}
            placeholder={t('interaction.inputPlaceholder')}
            className="flex-1 h-8 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-40"
          />
          <button
            onClick={() => {
              if (inputValue.trim()) handleReply(inputValue.trim(), inputValue.trim())
            }}
            disabled={!canSubmit || !inputValue.trim()}
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
