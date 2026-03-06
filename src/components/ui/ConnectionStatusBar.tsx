import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff, Wifi } from 'lucide-react'
import type { AnimpWebSocket } from '@/lib/ws-client'

interface Props {
  ws: AnimpWebSocket | null
  authIssue?: boolean
}

export function ConnectionStatusBar({ ws, authIssue }: Props) {
  const { t } = useTranslation()
  const [connected, setConnected] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const wasDisconnected = useRef(false)

  useEffect(() => {
    if (!ws) return
    setConnected(ws.connected)

    const unsub = ws.onConnectionChange((isConnected) => {
      setConnected(isConnected)
      if (isConnected && wasDisconnected.current) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 2000)
      }
      wasDisconnected.current = !isConnected
    })

    return unsub
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
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-all ${
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
        </>
      )}
    </div>
  )
}
