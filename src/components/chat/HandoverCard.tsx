import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronDown, ChevronUp, Package, Bug, Eye, BarChart3 } from 'lucide-react'
import { entityDisplayName } from '@/lib/utils'
import type { Message, Entity } from '@/lib/types'

interface HandoverData {
  handover_type?: string
  task_id?: number
  deliverables?: { type: string; url?: string; value?: string }[]
  context?: {
    changes_summary?: string
    known_issues?: string[]
    test_focus?: string[]
  }
  assign_to?: number[]
}

interface Props {
  message: Message
  participants?: Map<number, Entity>
}

const typeIcons: Record<string, typeof Package> = {
  task_completion: Package,
  bug_report: Bug,
  review_request: Eye,
  status_report: BarChart3,
}

export function HandoverCard({ message, participants }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const data = (message.layers?.data || {}) as HandoverData
  const handoverType = data.handover_type || 'task_completion'
  const Icon = typeIcons[handoverType] || Package

  const assignees = (data.assign_to || []).map((id) => {
    const entity = participants?.get(id)
    return entity ? entityDisplayName(entity) : `#${id}`
  })

  return (
    <div className="min-w-[260px] max-w-[400px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-accent)]/10 border-b border-[var(--color-border-subtle)]">
        <Icon className="w-4 h-4 text-[var(--color-accent)]" />
        <span className="text-xs font-medium text-[var(--color-accent)]">
          {t(`handover.${handoverType}`)}
        </span>
        {assignees.length > 0 && (
          <>
            <ArrowRight className="w-3 h-3 text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-secondary)] truncate">
              {assignees.join(', ')}
            </span>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="px-3 py-2">
        <p className="text-sm leading-relaxed">
          {message.layers?.summary || ''}
        </p>
      </div>

      {/* Deliverables + Context (collapsible) */}
      {(data.deliverables?.length || data.context) && (
        <div className="border-t border-[var(--color-border-subtle)]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {t('handover.details')}
          </button>

          {expanded && (
            <div className="px-3 pb-2 space-y-2">
              {/* Deliverables */}
              {data.deliverables && data.deliverables.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)] mb-1">
                    {t('handover.deliverables')}
                  </p>
                  <ul className="space-y-1">
                    {data.deliverables.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                        <span className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[10px] font-mono">
                          {d.type}
                        </span>
                        {d.url ? (
                          <a href={d.url} className="text-[var(--color-accent)] hover:underline truncate" target="_blank" rel="noopener noreferrer">
                            {d.url}
                          </a>
                        ) : (
                          <span className="truncate">{d.value}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Context */}
              {data.context && (
                <div className="space-y-1.5">
                  {data.context.changes_summary && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {data.context.changes_summary}
                    </p>
                  )}
                  {data.context.known_issues && data.context.known_issues.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-amber-500 mb-0.5">
                        {t('handover.knownIssues')}
                      </p>
                      <ul className="text-xs text-[var(--color-text-muted)] list-disc list-inside">
                        {data.context.known_issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Task reference */}
      {data.task_id && (
        <div className="px-3 py-1.5 border-t border-[var(--color-border-subtle)]">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {t('handover.linkedTask', { id: data.task_id })}
          </span>
        </div>
      )}
    </div>
  )
}
