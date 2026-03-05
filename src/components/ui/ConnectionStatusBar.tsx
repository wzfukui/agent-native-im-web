import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff, Wifi } from 'lucide-react'
import type { AnimpWebSocket } from '@/lib/ws-client'

interface Props {
  ws: AnimpWebSocket | null
}

export function ConnectionStatusBar({ ws }: Props) {
  const { t } = useTranslation()
  const [connected, setConnected] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
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

  if (connected && !showReconnected) return null

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-all ${
        connected
          ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
          : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
      }`}
    >
      {connected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          {t('connection.reconnected')}
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          {t('connection.disconnected')}
        </>
      )}
    </div>
  )
}
