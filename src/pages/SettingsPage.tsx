import { useNavigate, useOutletContext } from 'react-router-dom'
import { UserSettingsPage } from '@/components/settings/UserSettingsPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { AppOutletContext } from '@/layouts/AppLayout'

export function SettingsPage() {
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ctx = useOutletContext<AppOutletContext>()

  return (
    <ErrorBoundary>
      <div className="flex-1 h-full" style={{ animation: 'fade-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
        <UserSettingsPage onBack={() => navigate('/chat')} />
      </div>
    </ErrorBoundary>
  )
}
