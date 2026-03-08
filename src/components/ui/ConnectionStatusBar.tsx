import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff, Wifi } from 'lucide-react'
import type { AnimpWebSocket } from '@/lib/ws-client'

interface Props {
  ws: AnimpWebSocket | null
  authIssue?: boolean
  outboxCount?: number
  outboxFailedCount?: number
  lastSyncAt?: string | null
  lastError?: string | null
  onRetryNow?: () => void
}

export function ConnectionStatusBar({
  ws,
  authIssue,
  outboxCount = 0,
  outboxFailedCount = 0,
  lastSyncAt,
  lastError,
  onRetryNow,
}: Props) {
  const { t } = useTranslation()
  const [connected, setConnected] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const wasDisconnected = useRef(false)

  useEffect(() => {
    if (!ws) return
    setConnected(ws.connected)
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const unsub = ws.onConnectionChange((isConnected) => {
      setConnected(isConnected)
      if (isConnected && wasDisconnected.current) {
        setShowReconnected(true)
        hideTimer = setTimeout(() => setShowReconnected(false), 2000)
      }
      wasDisconnected.current = !isConnected
    })

    return () => {
      unsub()
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [ws])

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

  const issue = isOffline ? 'offline' : authIssue ? 'auth' : !connected ? 'server' : null
  if (!issue && !(connected && showReconnected)) return null

  return (
    <div className="flex justify-center py-1.5" style={{ animation: 'slide-up 0.2s ease-out' }}>
    <div
      className={`inline-flex items-center gap-2 px-4 py-1 text-xs font-medium rounded-full transition-all shadow-sm max-w-[90vw] flex-wrap justify-center ${
        !issue
          ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
          : issue === 'auth'
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
      }`}
    >
      {!issue ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          {t('connection.reconnected')}
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          {issue === 'offline'
            ? t('connection.offlineMode')
            : issue === 'auth'
              ? t('connection.authExpired')
              : t('connection.disconnected')}
          {outboxCount > 0 && <span className="ml-2 opacity-90">{t('connection.queuedMessages', { count: outboxCount })}</span>}
          {outboxFailedCount > 0 && <span className="opacity-90">{t('connection.failedMessages', { count: outboxFailedCount })}</span>}
          {lastSyncAt && <span className="opacity-75">{t('connection.lastSyncAt', { time: new Date(lastSyncAt).toLocaleTimeString() })}</span>}
          {onRetryNow && outboxCount > 0 && (
            <button
              onClick={onRetryNow}
              className="ml-1 px-2 py-0.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-[10px] cursor-pointer"
            >
              {t('connection.retryNow')}
            </button>
          )}
          {lastError && <span className="opacity-75 truncate max-w-[260px]">{t('connection.lastError', { error: lastError })}</span>}
        </>
      )}
    </div>
    </div>
  )
}
