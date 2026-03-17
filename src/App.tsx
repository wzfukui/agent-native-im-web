import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { JoinPage } from '@/pages/JoinPage'
import { ChatPage } from '@/pages/ChatPage'
import { BotsPage } from '@/pages/BotsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AdminPage } from '@/pages/AdminPage'

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

/** Guard: redirect unauthenticated users to login */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)

  if (!token || !entity) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <HashRedirect />
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
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
