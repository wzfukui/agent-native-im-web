import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react'
import type { Entity } from '@/lib/types'
import * as api from '@/lib/api'
import { applyGatewayUrl, clearGatewayUrl, getDefaultGatewayUrl, getGatewayUrl, persistGatewayUrl } from '@/lib/gateway'

interface Props {
  onRegister: (token: string, entity: Entity) => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onRegister, onSwitchToLogin }: Props) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGateway, setShowGateway] = useState(getGatewayUrl() !== getDefaultGatewayUrl())
  const [gateway, setGateway] = useState(getGatewayUrl())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!username || !password) {
      setError(t('auth.fieldsRequired'))
      return
    }
    
    if (password.length < 6) {
      setError(t('settings.passwordTooShort'))
      return
    }
    
    if (password !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }
    
    setLoading(true)
    try {
      try {
        if (showGateway) {
          persistGatewayUrl(gateway)
        } else {
          applyGatewayUrl(getGatewayUrl())
        }
      } catch {
        setError(t('auth.gatewayInvalid'))
        return
      }
      const res = await api.register(username, password, email || undefined, displayName || undefined)
      if (res.ok && res.data) {
        onRegister(res.data.token, res.data.entity)
      } else {
        setError(typeof res.error === 'string' ? res.error : res.error?.message || t('auth.registerError'))
      }
    } catch {
      setError(t('auth.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (pwd: string): { level: number; text: string } => {
    if (pwd.length === 0) return { level: 0, text: '' }
    if (pwd.length < 6) return { level: 1, text: t('auth.pwdTooShort') }
    if (pwd.length < 8) return { level: 2, text: t('auth.pwdWeak') }
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length
    if (strength >= 3 && pwd.length >= 8) return { level: 4, text: t('auth.pwdStrong') }
    if (strength >= 2) return { level: 3, text: t('auth.pwdMedium') }
    return { level: 2, text: t('auth.pwdWeak') }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t('auth.register')}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">
            {t('auth.joinTagline')}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 space-y-4 shadow-xl shadow-black/20"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              {t('auth.username')} *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.chooseUsername')}
              autoFocus
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              {t('auth.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth.displayNamePlaceholder')}
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              {t('auth.password')} *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordHint')}
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
            {password && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      passwordStrength.level === 1 ? 'bg-red-500' :
                      passwordStrength.level === 2 ? 'bg-orange-500' :
                      passwordStrength.level === 3 ? 'bg-yellow-500' :
                      passwordStrength.level === 4 ? 'bg-green-500' : 'bg-transparent'
                    }`}
                    style={{ width: `${passwordStrength.level * 25}%` }}
                  />
                </div>
                <span className={`text-xs ${
                  passwordStrength.level <= 1 ? 'text-red-500' :
                  passwordStrength.level === 2 ? 'text-orange-500' :
                  passwordStrength.level === 3 ? 'text-yellow-600' :
                  'text-green-500'
                }`}>
                  {passwordStrength.text}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              {t('settings.confirmPassword')} *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.reenterPassword')}
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setError('')
                setShowGateway((prev) => !prev)
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
            >
              {showGateway ? t('auth.hideGateway') : t('auth.useCustomGateway')}
            </button>
            {showGateway && (
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
                  {t('auth.gateway')}
                </label>
                <input
                  type="text"
                  value={gateway}
                  onChange={(e) => {
                    setError('')
                    setGateway(e.target.value)
                  }}
                  placeholder={getDefaultGatewayUrl()}
                  className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
                />
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)] normal-case tracking-normal">{t('auth.gatewayHelp')}</p>
                {gateway !== getDefaultGatewayUrl() && (
                  <button
                    type="button"
                    onClick={() => {
                      clearGatewayUrl()
                      setGateway(getDefaultGatewayUrl())
                      setError('')
                    }}
                    className="mt-2 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                  >
                    {t('auth.useOfficialGateway')}
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password || !confirmPassword}
            className="w-full h-10 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {t('auth.register')}
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full h-10 rounded-lg bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin')}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          Powered by ANIMP Protocol
        </p>
      </div>
    </div>
  )
}
