import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, Loader2 } from 'lucide-react'

interface Props {
  onSwitchToRegister?: () => void
  onLogin: (username: string, password: string) => Promise<void>
  error?: string
}

export function LoginForm({ onLogin, error, onSwitchToRegister }: Props) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      await onLogin(username, password)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-sm">
        {/* Brand — text-driven, no icon-in-gradient-square */}
        <div className="mb-10">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
            Agent-Native IM
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Form — clean card, no glassmorphism */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              {t('auth.usernameOrEmail')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.enterUsername')}
              autoFocus
              className="w-full h-11 px-3.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.enterPassword')}
              className="w-full h-11 px-3.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors text-sm"
            />
          </div>

          {error && (
            <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/8 border border-[var(--color-error)]/15 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-11 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {t('auth.signIn')}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            {t('auth.noAccount')} <span className="font-medium">{t('auth.signUp')}</span>
          </button>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            ANIMP Protocol
          </span>
        </div>
      </div>
    </div>
  )
}
