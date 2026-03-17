import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share, X } from 'lucide-react'

const DISMISS_KEY = 'aim_install_banner_dismissed'
const DISMISS_DAYS = 30

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function isIosSafariNotStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
  const isStandalone = ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
  return isIos && isSafari && !isStandalone
}

export function InstallBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => isIosSafariNotStandalone() && !isDismissed())

  if (!visible) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]"
      style={{ animation: 'slide-up 0.3s ease-out' }}
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-dim)] flex items-center justify-center flex-shrink-0">
        <Share className="w-4 h-4 text-[var(--color-accent)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-primary)]">{t('pwa.installApp')}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">{t('pwa.iosInstallHint')}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer flex-shrink-0"
      >
        <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
      </button>
    </div>
  )
}
