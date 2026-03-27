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
import { useState, useCallback } from 'react'
import * as api from '@/lib/api'
import type { Entity } from '@/lib/types'

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
  const [friendRequestCount, setFriendRequestCount] = useState(0)

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

  useEffect(() => {
    if (!token || !entity) {
      setFriendRequestCount(0)
      return
    }

    let cancelled = false

    const loadFriendRequests = async () => {
      const entitiesRes = await api.listEntities(token)
      const ownedBots = entitiesRes.ok && entitiesRes.data
        ? entitiesRes.data.filter((item: Entity) => item.entity_type !== 'user')
        : []
      const actingIds = [entity.id, ...ownedBots.map((item: Entity) => item.id)]
      const uniqueIds = Array.from(new Set(actingIds))
      const results = await Promise.all(
        uniqueIds.map((id) => api.listFriendRequests(token, { entityId: id, direction: 'incoming', status: 'pending' })),
      )
      if (cancelled) return
      const nextCount = results.reduce((sum, res) => sum + (res.ok && res.data ? res.data.length : 0), 0)
      setFriendRequestCount(nextCount)
    }

    void loadFriendRequests()
    const interval = window.setInterval(() => { void loadFriendRequests() }, 30000)
    const onFocus = () => { void loadFriendRequests() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [entity, token])

  // ─── Derive active view from URL ───
  const viewMode: 'chat' | 'friends' | 'bots' | 'settings' = (() => {
    if (location.pathname.startsWith('/friends')) return 'friends'
    if (location.pathname.startsWith('/bots')) return 'bots'
    if (location.pathname.startsWith('/settings')) return 'settings'
    return 'chat'
  })()

  // Determine if mobile is showing a detail view (chat thread or bot detail)
  const isMobileInDetail = isMobile && (
    (viewMode === 'chat' && location.pathname.match(/^\/chat\/\d+/)) ||
    (viewMode === 'bots' && location.pathname.match(/^\/bots\/\d+/))
  )
  const showMobileTabBar = isMobile && !isMobileInDetail

  const mobileTab: MobileTab = viewMode === 'bots' ? 'bots' : viewMode === 'friends' ? 'friends' : viewMode === 'settings' ? 'settings' : 'chat'

  const handleMobileTabChange = useCallback((tab: MobileTab) => {
    if (tab === 'chat') navigate('/chat')
    else if (tab === 'friends') navigate('/friends')
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
            friendsMode={viewMode === 'friends'}
            settingsMode={viewMode === 'settings'}
            friendRequestCount={friendRequestCount}
            onToggleBots={() => navigate(viewMode === 'bots' ? '/chat' : '/bots')}
            onToggleFriends={() => navigate(viewMode === 'friends' ? '/chat' : '/friends')}
            onToggleChat={() => navigate('/chat')}
            onToggleSettings={() => navigate(viewMode === 'settings' ? '/chat' : '/settings')}
          />
        )}

        <main role="main" aria-label={t('a11y.mainContent')} className="flex-1 min-w-0">
        <Outlet context={{
          ws,
          convManager,
          botManager,
          isMobile,
        }} />
        </main>
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
        <MobileTabBar activeTab={mobileTab} friendRequestCount={friendRequestCount} onTabChange={handleMobileTabChange} />
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
  isMobile: boolean
}
