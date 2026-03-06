import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { APIErrorDetail } from '../../lib/types'

export interface ErrorToastData {
  id: string
  message: string
  detail?: APIErrorDetail
  timestamp: number
  category?: 'auth' | 'network' | 'permission' | 'server' | 'unknown'
  guidanceKey?: string
}

interface ErrorToastProps {
  errors: ErrorToastData[]
  onDismiss: (id: string) => void
}

export function ErrorToast({ errors, onDismiss }: ErrorToastProps) {
  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {errors.map((err) => (
        <ErrorToastItem key={err.id} error={err} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ErrorToastItem({ error, onDismiss }: { error: ErrorToastData; onDismiss: (id: string) => void }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auto-dismiss after 15 seconds (unless expanded)
  useEffect(() => {
    if (expanded) return
    const timer = setTimeout(() => onDismiss(error.id), 15000)
    return () => clearTimeout(timer)
  }, [error.id, expanded, onDismiss])

  const handleCopy = useCallback(async () => {
    const diagnosticInfo = buildDiagnosticText(error)
    try {
      await navigator.clipboard.writeText(diagnosticInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS
      const ta = document.createElement('textarea')
      ta.value = diagnosticInfo
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [error])

  const detail = error.detail
  const guidance = error.guidanceKey ? t(error.guidanceKey) : ''

  return (
    <div
      className="pointer-events-auto bg-red-950/95 border border-red-800/60 rounded-lg shadow-2xl backdrop-blur-sm animate-[slide-up_0.2s_ease-out]"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-100 font-medium leading-snug">{error.message}</p>
          {guidance && <p className="text-[11px] text-red-200/80 mt-1">{guidance}</p>}
          {detail && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-red-400/80 font-mono">
              <span className="bg-red-900/50 px-1.5 py-0.5 rounded">{detail.code}</span>
              <span className="truncate">{detail.request_id}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => onDismiss(error.id)}
          className="text-red-400 hover:text-red-200 p-0.5 shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Actions */}
      {detail && (
        <div className="flex items-center gap-1 px-3 pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-red-300/70 hover:text-red-200 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? t('common.hideDetails') : t('common.showDetails')}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] bg-red-800/50 hover:bg-red-700/60 text-red-200 px-2 py-1 rounded transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? t('common.copied') : t('common.copyDiagnostic')}
          </button>
        </div>
      )}

      {/* Expanded details */}
      {expanded && detail && (
        <div className="border-t border-red-800/40 px-3 py-2 text-[10px] font-mono text-red-300/80 space-y-1 max-h-48 overflow-y-auto">
          <Row label={t('common.errorCode')} value={detail.code} />
          <Row label={t('common.requestId')} value={detail.request_id} />
          <Row label="Status" value={String(detail.status)} />
          <Row label="Method" value={detail.method} />
          <Row label="Path" value={detail.path} />
          <Row label="Timestamp" value={detail.timestamp} />
          {detail.details && Object.entries(detail.details).map(([k, v]) => (
            <Row key={k} label={k} value={typeof v === 'string' ? v : JSON.stringify(v)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-red-400/60 shrink-0 w-20 text-right">{label}:</span>
      <span className="text-red-200/80 break-all">{value}</span>
    </div>
  )
}

/**
 * Build a diagnostic text block designed for pasting into an LLM for analysis.
 * Includes all structured error info in a format optimized for AI consumption.
 */
function buildDiagnosticText(error: ErrorToastData): string {
  const detail = error.detail
  if (!detail) {
    return `Error: ${error.message}\nTime: ${new Date(error.timestamp).toISOString()}`
  }

  const lines = [
    `## API Error Diagnostic`,
    ``,
    `**Error**: ${detail.message}`,
    `**Code**: ${detail.code}`,
    `**Status**: ${detail.status}`,
    `**Request ID**: ${detail.request_id}`,
    `**Method**: ${detail.method}`,
    `**Path**: ${detail.path}`,
    `**Timestamp**: ${detail.timestamp}`,
  ]

  if (detail.details && Object.keys(detail.details).length > 0) {
    lines.push(``, `**Details**:`)
    lines.push('```json')
    lines.push(JSON.stringify(detail.details, null, 2))
    lines.push('```')
  }

  lines.push(``, `---`, `请帮我分析此 API 错误并提供解决方案。`)

  return lines.join('\n')
}
