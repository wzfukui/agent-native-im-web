import { cn } from '@/lib/utils'
import type { ActiveStream } from '@/lib/types'
import { Loader2, Brain, ChevronDown, ChevronUp, Square } from 'lucide-react'
import { useState } from 'react'

interface Props {
  streams: ActiveStream[]
  onCancel?: (streamId: string, conversationId: number) => void
}

export function StreamingOverlay({ streams, onCancel }: Props) {
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null)

  if (streams.length === 0) return null

  return (
    <div className="px-4 pb-2 space-y-2" style={{ animation: 'slideUp 0.25s ease-out' }}>
      {streams.map((stream) => {
        const status = stream.layers.status
        const thinking = stream.layers.thinking
        const progress = status?.progress ?? 0
        const isExpanded = expandedThinking === stream.stream_id

        return (
          <div
            key={stream.stream_id}
            className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl p-3 space-y-2"
          >
            {/* Status bar */}
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" style={{ animation: 'spin 1.2s linear infinite' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {status?.text || stream.layers.summary || 'Processing...'}
                </p>
              </div>
              {status?.phase && (
                <span className="text-[10px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-dim)] px-2 py-0.5 rounded-full flex-shrink-0">
                  {status.phase}
                </span>
              )}
              {onCancel && (
                <button
                  onClick={() => onCancel(stream.stream_id, stream.conversation_id)}
                  className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-error)]/10 px-2 py-1 rounded-md cursor-pointer transition-colors flex-shrink-0"
                  title="停止生成"
                >
                  <Square className="w-2.5 h-2.5" />
                  Stop
                </button>
              )}
            </div>

            {/* Progress bar */}
            {progress > 0 && (
              <div className="h-1 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#8b5cf6] transition-all duration-500"
                  style={{ width: `${Math.min(progress * 100, 100)}%` }}
                />
              </div>
            )}

            {/* Thinking toggle */}
            {thinking && (
              <div>
                <button
                  onClick={() => setExpandedThinking(isExpanded ? null : stream.stream_id)}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                >
                  <Brain className="w-3 h-3" />
                  <span>Thinking process</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {isExpanded && (
                  <div className="mt-1.5 px-2.5 py-2 bg-[var(--color-bg-primary)] rounded-lg text-[11px] text-[var(--color-text-muted)] leading-relaxed italic max-h-24 overflow-y-auto">
                    {thinking}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
