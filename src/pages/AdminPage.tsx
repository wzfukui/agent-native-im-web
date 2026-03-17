import { useNavigate, useOutletContext } from 'react-router-dom'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import type { AppOutletContext } from '@/layouts/AppLayout'

export function AdminPage() {
  const navigate = useNavigate()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ctx = useOutletContext<AppOutletContext>()

  return (
    <div className="flex-1 min-w-0" style={{ animation: 'fade-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
      <ErrorBoundary>
        <AdminPanel onBack={() => navigate('/chat')} />
      </ErrorBoundary>
    </div>
  )
}
