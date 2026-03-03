import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-error)]/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[var(--color-error)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{i18n.t('common.errorTitle')}</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-xs">
              {this.state.error?.message || i18n.t('common.errorUnexpected')}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-3 h-3" />
            {i18n.t('common.reload')}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
