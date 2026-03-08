import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function ConsentBanner({ onPrivacy }: { onPrivacy?: () => void }) {
  const { t } = useTranslation()
  const [accepted, setAccepted] = useState(() => localStorage.getItem('aim_consent') === '1')

  if (accepted) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] shadow-lg">
      <div className="max-w-xl mx-auto flex items-center gap-4">
        <p className="text-xs text-[var(--color-text-secondary)] flex-1">
          {t('consent.message')}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onPrivacy && (
            <button
              onClick={onPrivacy}
              className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {t('consent.learnMore')}
            </button>
          )}
          <button
            onClick={() => { localStorage.setItem('aim_consent', '1'); setAccepted(true) }}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium cursor-pointer hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            {t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
