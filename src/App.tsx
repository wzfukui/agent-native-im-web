import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { JoinPage } from '@/pages/JoinPage'
import { ChatPage } from '@/pages/ChatPage'
import { BotsPage } from '@/pages/BotsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import * as api from '@/lib/api'
import { getCachedUser } from '@/lib/cache'
import { getCookieSessionToken, getOfflineCachedToken } from '@/lib/session-token'

/** Redirect old #c=xxx hash URLs to /chat/xxx */
function HashRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#c=')) {
      const id = hash.slice(3)
      if (/^\d+$/.test(id)) {
        navigate(`/chat/${id}`, { replace: true })
      }
    }
  }, [location, navigate])

  return null
}

/** On page load, try to restore session from HttpOnly cookie (if no sessionStorage token). */
function SessionRestore() {
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)
  const sessionChecked = useAuthStore((s) => s.sessionChecked)
  const { setAuth, setSessionChecked } = useAuthStore()

  useEffect(() => {
    if (sessionChecked) return
    // If we already have a token + entity from sessionStorage, no need to check cookie
    if (token && entity) {
      setSessionChecked()
      return
    }
    // Try to validate session via cookie (GET /me with credentials: include)
    api.getMe('').then((res) => {
      if (res.ok && res.data) {
        // Cookie is valid — restore session. We use a placeholder token since
        // the cookie handles auth; sessionStorage token is a convenience for
        // the current tab only.
        setAuth(getCookieSessionToken(), res.data)
      }
    }).catch(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cachedUser = await getCachedUser()
        if (cachedUser) {
          setAuth(getOfflineCachedToken(), cachedUser)
          return
        }
      }
    }).finally(() => {
      setSessionChecked()
    })
  }, [token, entity, sessionChecked, setAuth, setSessionChecked])

  return null
}

/** Guard: redirect unauthenticated users to login */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)
  const sessionChecked = useAuthStore((s) => s.sessionChecked)

  // Wait for session restore attempt before redirecting
  if (!sessionChecked) {
    return null // or a loading spinner
  }

  if (!token || !entity) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <HashRedirect />
      <SessionRestore />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />

        {/* Join invite (requires auth) */}
        <Route path="/join/:code" element={
          <RequireAuth><JoinPage /></RequireAuth>
        } />

        {/* Authenticated routes */}
        <Route element={
          <RequireAuth><AppLayout /></RequireAuth>
        }>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="/bots" element={<BotsPage />} />
          <Route path="/bots/:botId" element={<BotsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:section" element={<SettingsPage />} />
          <Route path="/admin" element={<Navigate to="/chat" replace />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
