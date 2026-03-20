import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, ChevronRight, MessagesSquare, TerminalSquare } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'

interface Props {
  conversationId: number
  prompt?: string
  messageCount: number
  onOpenSettings?: () => void
}

function truncate(text: string, max = 140) {
  const value = text.trim()
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}…`
}

export function ConversationContextCard({ conversationId, prompt = '', messageCount, onOpenSettings }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [resolvedPrompt, setResolvedPrompt] = useState(prompt)
  const [memoryCount, setMemoryCount] = useState(0)

  useEffect(() => {
    setResolvedPrompt(prompt)
  }, [prompt])

  useEffect(() => {
    let cancelled = false
    api.listMemories(token, conversationId).then((res) => {
      if (cancelled || !res.ok || !res.data) return
      setResolvedPrompt(res.data.prompt || '')
      setMemoryCount((res.data.memories || []).length)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [token, conversationId])

  const promptPreview = useMemo(() => truncate(resolvedPrompt), [resolvedPrompt])
  const hasContext = !!promptPreview || memoryCount > 0

  if (!hasContext) return null

  return (
    <button
      onClick={onOpenSettings}
      disabled={!onOpenSettings}
      className="mx-4 mt-3 mb-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-left hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-[var(--color-bg-secondary)]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">{t('memory.contextTitle')}</span>
        </div>
        {onOpenSettings ? <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> : null}
      </div>

      {promptPreview && (
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center flex-shrink-0">
            <TerminalSquare className="w-3 h-3 text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{t('memory.contextPrompt')}</div>
            <div className="text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">{promptPreview}</div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2.5 mt-2">
        <div className="w-6 h-6 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center flex-shrink-0">
          <MessagesSquare className="w-3 h-3 text-[var(--color-text-secondary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{t('memory.contextMemories')}</div>
          <div className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {t('memory.contextSummary', { count: memoryCount, messages: messageCount })}
          </div>
        </div>
      </div>
    </button>
  )
}
