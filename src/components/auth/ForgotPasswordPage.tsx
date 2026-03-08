import { useTranslation } from 'react-i18next'
import { ArrowLeft, ShieldQuestion } from 'lucide-react'

interface Props {
  onBack: () => void
}

export function ForgotPasswordPage({ onBack }: Props) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t('forgotPassword.title')}
          </h1>
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 space-y-4 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3 py-2">
            <ShieldQuestion className="w-8 h-8 text-[var(--color-accent)] flex-shrink-0" />
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {t('forgotPassword.description')}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full h-10 rounded-lg bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('forgotPassword.back')}
          </button>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          ANIMP Protocol
        </p>
      </div>
    </div>
  )
}
