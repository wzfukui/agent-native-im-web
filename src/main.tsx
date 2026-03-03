import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Apply saved theme on load
const savedTheme = (() => {
  try { return JSON.parse(localStorage.getItem('aim_theme') || '"dark"') } catch { return 'dark' }
})()
if (savedTheme && savedTheme !== 'dark') {
  document.documentElement.dataset.theme = savedTheme
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
