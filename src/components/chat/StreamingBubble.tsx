import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import type { ActiveStream, Entity } from '@/lib/types'
import { Loader2, Brain, ChevronDown, ChevronUp, Square } from 'lucide-react'

interface Props {
  stream: ActiveStream
  sender?: Entity
  onCancel?: (streamId: string, conversationId: number) => void
}

export function StreamingBubble({ stream, sender, onCancel }: Props) {
  const { t } = useTranslation()
  const [showThinking, setShowThinking] = useState(false)

  const status = stream.layers.status
  const thinking = stream.layers.thinking
  const summary = stream.layers.summary || ''
  const progress = status?.progress ?? 0

  return (
    <div className="flex gap-2.5 max-w-[85%]" style={{ animation: 'slide-up 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
      {/* Avatar */}
      <EntityAvatar entity={sender} size="sm" className="mt-0.5" />

      <div className="space-y-0.5 flex flex-col items-start">
        {/* Sender name */}
        {sender && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-medium text-[var(--color-bot)]">
              {sender.display_name || sender.name}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] opacity-40">
              {t('streaming.processing')}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div className="rounded-2xl rounded-tl-md bg-[var(--color-bubble-other)] border border-[var(--color-border-subtle)] overflow-hidden">
          {/* Content area */}
          <div className="px-3.5 py-2.5 min-w-[200px]">
            {summary ? (
              <div className="md text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                {/* Typing cursor */}
                <span className="inline-block w-0.5 h-4 bg-[var(--color-accent)] ml-0.5 align-text-bottom" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[var(--color-accent)]" style={{ animation: 'spin 1.2s linear infinite' }} />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {status?.text || t('streaming.processing')}
                </span>
              </div>
            )}
          </div>

          {/* Status bar (phase + progress) */}
          {(status?.phase || progress > 0) && (
            <div className="px-3.5 pb-2 space-y-1.5">
              {status?.phase && summary && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-[var(--color-accent)]" style={{ animation: 'spin 1.2s linear infinite' }} />
                  <span className="text-[10px] text-[var(--color-text-muted)]">{status.text || status.phase}</span>
                </div>
              )}
              {progress > 0 && (
                <div className="h-1 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                    style={{ width: `${Math.min(progress * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls row: thinking + cancel */}
        <div className="flex items-center gap-3 px-1">
          {thinking && (
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            >
              <Brain className="w-3 h-3" />
              <span>{t('message.thinking')}</span>
              {showThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(stream.stream_id, stream.conversation_id)}
              className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
            >
              <Square className="w-2.5 h-2.5" />
              {t('streaming.stop')}
            </button>
          )}
        </div>

        {/* Expanded thinking */}
        {showThinking && thinking && (
          <div className="mx-1 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded-lg text-[11px] text-[var(--color-text-muted)] leading-relaxed italic max-h-32 overflow-y-auto max-w-full">
            {thinking}
          </div>
        )}
      </div>
    </div>
  )
}
