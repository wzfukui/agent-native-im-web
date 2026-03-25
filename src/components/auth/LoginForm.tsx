import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, Loader2 } from 'lucide-react'
import { applyGatewayUrl, clearGatewayUrl, getDefaultGatewayUrl, getGatewayUrl, persistGatewayUrl } from '@/lib/gateway'

interface Props {
  onSwitchToRegister?: () => void
  onLogin: (username: string, password: string) => Promise<void>
  error?: string
  offlineHint?: string
  onForgotPassword?: () => void
  onTerms?: () => void
  onPrivacy?: () => void
}

export function LoginForm({ onLogin, error, offlineHint, onSwitchToRegister, onForgotPassword, onTerms, onPrivacy }: Props) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGateway, setShowGateway] = useState(getGatewayUrl() !== getDefaultGatewayUrl())
  const [gateway, setGateway] = useState(getGatewayUrl())
  const [gatewayError, setGatewayError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      if (showGateway) {
        try {
          persistGatewayUrl(gateway)
          setGatewayError('')
        } catch {
          setGatewayError(t('auth.gatewayInvalid'))
          return
        }
      } else {
        applyGatewayUrl(getGatewayUrl())
      }
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
          {offlineHint && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/15 rounded-lg px-3 py-2.5">
              {offlineHint}
            </div>
          )}
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

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setGatewayError('')
                setShowGateway((prev) => !prev)
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
            >
              {showGateway ? t('auth.hideGateway') : t('auth.useCustomGateway')}
            </button>
            {showGateway && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  {t('auth.gateway')}
                </label>
                <input
                  type="text"
                  value={gateway}
                  onChange={(e) => {
                    setGateway(e.target.value)
                    setGatewayError('')
                  }}
                  placeholder={getDefaultGatewayUrl()}
                  className="w-full h-11 px-3.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors text-sm"
                />
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{t('auth.gatewayHelp')}</p>
                {gateway !== getDefaultGatewayUrl() && (
                  <button
                    type="button"
                    onClick={() => {
                      clearGatewayUrl()
                      setGateway(getDefaultGatewayUrl())
                      setGatewayError('')
                    }}
                    className="mt-2 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                  >
                    {t('auth.useOfficialGateway')}
                  </button>
                )}
              </div>
            )}
          </div>

          {(error || gatewayError) && (
            <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/8 border border-[var(--color-error)]/15 rounded-lg px-3 py-2.5">
              {gatewayError || error}
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

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
            >
              {t('auth.noAccount')} <span className="font-medium">{t('auth.signUp')}</span>
            </button>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
              >
                {t('forgotPassword.title')}
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--color-text-muted)]">
            {onTerms && (
              <button onClick={onTerms} className="hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors">
                {t('legal.termsTitle')}
              </button>
            )}
            {onTerms && onPrivacy && <span>·</span>}
            {onPrivacy && (
              <button onClick={onPrivacy} className="hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors">
                {t('legal.privacyTitle')}
              </button>
            )}
            <span>·</span>
            <span>ANIMP Protocol</span>
          </div>
        </div>
      </div>
    </div>
  )
}
