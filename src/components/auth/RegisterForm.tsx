import { useState } from 'react'
import { UserPlus, Loader2, Zap, ArrowLeft } from 'lucide-react'
import type { Entity } from '@/lib/types'
import * as api from '@/lib/api'

interface Props {
  onRegister: (token: string, entity: Entity) => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onRegister, onSwitchToLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!username || !password) {
      setError('Username and password are required')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)
    try {
      const res = await api.register(username, password, undefined, displayName || undefined)
      if (res.ok && res.data) {
        onRegister(res.data.token, res.data.entity)
      } else {
        setError(res.error || 'Registration failed')
      }
    } catch {
      setError('Network error — cannot reach server')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (pwd: string): { level: number; text: string } => {
    if (pwd.length === 0) return { level: 0, text: '' }
    if (pwd.length < 6) return { level: 1, text: 'Too short' }
    if (pwd.length < 8) return { level: 2, text: 'Weak' }
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length
    if (strength >= 3 && pwd.length >= 8) return { level: 4, text: 'Strong' }
    if (strength >= 2) return { level: 3, text: 'Medium' }
    return { level: 2, text: 'Weak' }
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[#8b5cf6] mb-4 shadow-lg shadow-[var(--color-accent)]/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Create Account
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
            Join Agent-Native IM
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 space-y-4 shadow-xl shadow-black/20"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoFocus
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name (optional)"
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
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
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full h-10 px-3.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all text-sm"
            />
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
                Create Account
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full h-10 rounded-lg bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          Powered by ANIMP Protocol
        </p>
      </div>
    </div>
  )
}
