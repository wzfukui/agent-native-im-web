import type { InteractionLayer } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  interaction: InteractionLayer
  messageId: number
  onReply: (choice: string, label: string) => void
  disabled?: boolean
}

export function InteractionCard({ interaction, messageId, onReply, disabled }: Props) {
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
            onClick={() => onReply(opt.value, opt.label)}
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
