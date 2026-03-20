import { useTranslation } from 'react-i18next'
import { Bot, MessageSquare, Sparkles, ArrowRight } from 'lucide-react'

interface Props {
  onNewChat?: () => void
  onManageBots?: () => void
  compact?: boolean
}

export function OnboardingCard({ onNewChat, onManageBots, compact = false }: Props) {
  const { t } = useTranslation()

  const steps = [
    {
      icon: Bot,
      title: t('onboarding.stepMentionTitle'),
      description: t('onboarding.stepMentionDescription'),
      accent: 'text-[var(--color-bot)]',
      surface: 'bg-[var(--color-bot)]/12',
    },
    {
      icon: Sparkles,
      title: t('onboarding.stepContextTitle'),
      description: t('onboarding.stepContextDescription'),
      accent: 'text-[var(--color-accent)]',
      surface: 'bg-[var(--color-accent)]/12',
    },
    {
      icon: MessageSquare,
      title: t('onboarding.stepInteractionTitle'),
      description: t('onboarding.stepInteractionDescription'),
      accent: 'text-emerald-500',
      surface: 'bg-emerald-500/12',
    },
  ]

  return (
    <div className={`rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] ${compact ? 'p-4' : 'p-5 shadow-sm shadow-black/5'}`}>
      <div className={compact ? 'mb-3' : 'mb-4'}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1">
          {t('onboarding.eyebrow')}
        </p>
        <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]`}>
          {t('onboarding.title')}
        </h3>
        <p className={`${compact ? 'text-xs mt-1' : 'text-sm mt-1.5'} text-[var(--color-text-secondary)] leading-relaxed`}>
          {t('onboarding.description')}
        </p>
      </div>

      <div className={`${compact ? 'space-y-2.5' : 'space-y-3'}`}>
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-2xl ${step.surface} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${step.accent}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{step.title}</p>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] ${compact ? 'p-3' : 'p-3.5'}`}>
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">
          {t('onboarding.boundaryTitle')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
          {t('onboarding.boundaryDescription')}
        </p>
      </div>

      {!compact && (onNewChat || onManageBots) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium cursor-pointer transition-colors"
            >
              {t('onboarding.primaryAction')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {onManageBots && (
            <button
              onClick={onManageBots}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm font-medium cursor-pointer transition-colors"
            >
              {t('onboarding.secondaryAction')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
