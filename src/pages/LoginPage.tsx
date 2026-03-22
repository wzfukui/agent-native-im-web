import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ForgotPasswordPage } from '@/components/auth/ForgotPasswordPage'
import { TermsPage } from '@/components/legal/TermsPage'
import { PrivacyPage } from '@/components/legal/PrivacyPage'
import { ConsentBanner } from '@/components/ui/ConsentBanner'
import * as api from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { useTranslation } from 'react-i18next'
import type { Entity } from '@/lib/types'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)

  const [loginError, setLoginError] = useState('')
  const [authPage, setAuthPage] = useState<'login' | 'register' | 'forgot' | 'terms' | 'privacy'>('login')
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // If already logged in, redirect
  if (token && entity) {
    navigate('/chat', { replace: true })
    return null
  }

  const handleLogin = async (username: string, password: string) => {
    setLoginError('')
    try {
      const res = await api.login(username, password)
      if (res.ok && res.data) {
        setAuth(res.data.token, res.data.entity)
        navigate('/chat', { replace: true })
      } else {
        setLoginError(getErrorMessage(res) || t('auth.loginError'))
      }
    } catch {
      setLoginError(t('auth.networkError'))
    }
  }

  const handleRegister = (regToken: string, regEntity: Entity) => {
    setAuth(regToken, regEntity)
    navigate('/chat', { replace: true })
  }

  if (authPage === 'terms') return <TermsPage onBack={() => setAuthPage('login')} />
  if (authPage === 'privacy') return <PrivacyPage onBack={() => setAuthPage('login')} />
  if (authPage === 'forgot') return <ForgotPasswordPage onBack={() => setAuthPage('login')} />
  if (authPage === 'register') {
    return <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setAuthPage('login')} />
  }

  return (
    <>
      <LoginForm
        onLogin={handleLogin}
        error={loginError}
        offlineHint={isOffline ? t('auth.offlineFirstLoginHint') : undefined}
        onSwitchToRegister={() => setAuthPage('register')}
        onForgotPassword={() => setAuthPage('forgot')}
        onTerms={() => setAuthPage('terms')}
        onPrivacy={() => setAuthPage('privacy')}
      />
      <ConsentBanner onPrivacy={() => setAuthPage('privacy')} />
    </>
  )
}
