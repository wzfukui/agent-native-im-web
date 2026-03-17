import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './i18n'
import App from './App'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Register PWA service worker with auto-update and refresh notification
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update toast
    const toast = document.createElement('div')
    toast.id = 'sw-update-toast'
    toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:12px;padding:12px 20px;border-radius:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border);box-shadow:0 4px 24px rgba(0,0,0,0.3);animation:slide-up 0.3s ease-out;font-family:var(--font-sans);'
    toast.innerHTML = `
      <span style="font-size:13px;color:var(--color-text-primary);">New version available</span>
      <button id="sw-refresh-btn" style="padding:6px 14px;border-radius:8px;background:var(--color-accent);color:white;font-size:12px;font-weight:600;border:none;cursor:pointer;">Refresh</button>
      <button id="sw-dismiss-btn" style="padding:4px;border:none;background:transparent;color:var(--color-text-muted);cursor:pointer;font-size:16px;">&times;</button>
    `
    document.body.appendChild(toast)
    document.getElementById('sw-refresh-btn')?.addEventListener('click', () => {
      updateSW(true)
    })
    document.getElementById('sw-dismiss-btn')?.addEventListener('click', () => {
      toast.remove()
    })
  },
  onOfflineReady() { console.log('PWA: offline ready') },
})

// Apply saved theme on load (supports 'system' auto-switch)
const savedTheme = (() => {
  try { return JSON.parse(localStorage.getItem('aim_theme') || '"dark"') } catch { return 'dark' }
})()
if (savedTheme === 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light'
} else if (savedTheme && savedTheme !== 'dark') {
  document.documentElement.dataset.theme = savedTheme
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
