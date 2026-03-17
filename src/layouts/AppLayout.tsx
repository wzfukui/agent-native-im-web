import { useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useWebSocketManager } from '@/hooks/useWebSocketManager'
import { useConversationManager } from '@/hooks/useConversationManager'
import { useBotManager } from '@/hooks/useBotManager'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar, type MobileTab } from '@/components/layout/MobileTabBar'
import { ConnectionStatusBar } from '@/components/ui/ConnectionStatusBar'
import { InstallBanner } from '@/components/ui/InstallBanner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorToast, type ErrorToastData } from '@/components/ui/ErrorToast'
import { registerPushNotifications } from '@/lib/push'
import { setSessionHooks } from '@/lib/auth-session'
import { setGlobalErrorHandler, type ParsedError } from '@/lib/errors'
import * as api from '@/lib/api'
import { useState, useCallback } from 'react'

export function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { token, entity, setToken, logout } = useAuthStore()
  const isMobile = useIsMobile()
  const conversations = useConversationsStore((s) => s.conversations)
  const mutedIds = useConversationsStore((s) => s.mutedIds)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token || !entity) {
      navigate('/login', { replace: true })
    }
  }, [token, entity, navigate])

  // ─── Session hooks ───
  useEffect(() => {
    setSessionHooks({
      getToken: () => useAuthStore.getState().token,
      setToken: (nextToken: string) => setToken(nextToken),
      onAuthFailure: () => logout(),
    })
  }, [setToken, logout])

  // ─── Hooks ───
  const ws = useWebSocketManager()
  const convManager = useConversationManager()
  const botManager = useBotManager()

  // ─── Global error handler ───
  const [errorToasts, setErrorToasts] = useState<ErrorToastData[]>([])

  const pushError = useCallback((parsed: ParsedError) => {
    const toast: ErrorToastData = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message: parsed.message,
      detail: parsed.detail,
      category: parsed.category,
      guidanceKey: parsed.guidanceKey,
      timestamp: Date.now(),
    }
    setErrorToasts((prev) => [...prev.slice(-4), toast])
  }, [])

  const dismissError = useCallback((id: string) => {
    setErrorToasts((prev) => prev.filter((e) => e.id !== id))
  }, [])

  useEffect(() => {
    setGlobalErrorHandler(pushError)
  }, [pushError])

  // ─── Admin detection ───
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!token) { setIsAdmin(false); return }
    api.adminGetStats(token).then((res) => setIsAdmin(res.ok === true))
  }, [token])

  // ─── Push notifications ───
  useEffect(() => {
    if (token) registerPushNotifications(token)
  }, [token])

  // ─── Title badge for unread count ───
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => {
      if (mutedIds.has(c.id)) return sum
      return sum + (c.unread_count || 0)
    }, 0)
  }, [conversations, mutedIds])

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Agent-Native IM` : 'Agent-Native IM'
  }, [totalUnread])

  // ─── Derive active view from URL ───
  const viewMode: 'chat' | 'bots' | 'admin' | 'settings' = (() => {
    if (location.pathname.startsWith('/bots')) return 'bots'
    if (location.pathname.startsWith('/admin')) return 'admin'
    if (location.pathname.startsWith('/settings')) return 'settings'
    return 'chat'
  })()

  // Determine if mobile is showing a detail view (chat thread or bot detail)
  const isMobileInDetail = isMobile && (
    (viewMode === 'chat' && location.pathname.match(/^\/chat\/\d+/)) ||
    (viewMode === 'bots' && location.pathname.match(/^\/bots\/\d+/))
  )
  const showMobileTabBar = isMobile && !isMobileInDetail

  const mobileTab: MobileTab = viewMode === 'bots' ? 'bots' : viewMode === 'settings' ? 'settings' : 'chat'

  const handleMobileTabChange = useCallback((tab: MobileTab) => {
    if (tab === 'chat') navigate('/chat')
    else if (tab === 'bots') navigate('/bots')
    else if (tab === 'settings') navigate('/settings')
  }, [navigate])

  if (!token || !entity) return null

  return (
    <div className="h-full flex flex-col">
      <InstallBanner />
      <ConnectionStatusBar
        ws={ws.wsClient}
        authIssue={ws.authHandshakeIssue}
        outboxCount={convManager.outboxCount}
        outboxFailedCount={convManager.outboxFailedCount}
        lastSyncAt={convManager.outboxLastSyncAt}
        lastError={convManager.outboxLastError}
        onRetryNow={convManager.retryOutboxNow}
      />
      <div className="flex-1 flex min-h-0">
        {/* Icon sidebar - hidden on mobile */}
        {!isMobile && (
          <Sidebar
            botMode={viewMode === 'bots'}
            adminMode={viewMode === 'admin'}
            settingsMode={viewMode === 'settings'}
            isAdmin={isAdmin}
            onToggleBots={() => navigate(viewMode === 'bots' ? '/chat' : '/bots')}
            onToggleAdmin={() => navigate(viewMode === 'admin' ? '/chat' : '/admin')}
            onToggleChat={() => navigate('/chat')}
            onToggleSettings={() => navigate(viewMode === 'settings' ? '/chat' : '/settings')}
          />
        )}

        <Outlet context={{
          ws,
          convManager,
          botManager,
          isAdmin,
          isMobile,
        }} />
      </div>

      <ConfirmDialog
        open={convManager.leaveConfirmId !== null}
        title={t('settings.leave')}
        message={t('settings.leaveConfirm')}
        variant="danger"
        confirmLabel={t('settings.leave')}
        onConfirm={convManager.confirmLeave}
        onCancel={() => convManager.setLeaveConfirmId(null)}
      />

      <ErrorToast errors={errorToasts} onDismiss={dismissError} />

      {/* Mobile bottom tab bar */}
      {showMobileTabBar && (
        <MobileTabBar activeTab={mobileTab} onTabChange={handleMobileTabChange} />
      )}
    </div>
  )
}

// Type for outlet context
import type { useWebSocketManager as UseWSType } from '@/hooks/useWebSocketManager'
import type { useConversationManager as UseConvType } from '@/hooks/useConversationManager'
import type { useBotManager as UseBotType } from '@/hooks/useBotManager'

export interface AppOutletContext {
  ws: ReturnType<typeof UseWSType>
  convManager: ReturnType<typeof UseConvType>
  botManager: ReturnType<typeof UseBotType>
  isAdmin: boolean
  isMobile: boolean
}
