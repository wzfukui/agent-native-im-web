import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, ChevronRight, ListTodo, MessagesSquare, TerminalSquare } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { cacheConversationContext, getCachedConversationContext } from '@/lib/cache'
import type { ConversationMemory, Task } from '@/lib/types'

interface Props {
  conversationId: number
  prompt?: string
  messageCount: number
  onOpenSettings?: () => void
  onOpenTasks?: () => void
}

function truncate(text: string, max = 140) {
  const value = text.trim()
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}…`
}

export function ConversationContextCard({ conversationId, prompt = '', messageCount, onOpenSettings, onOpenTasks }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [resolvedPrompt, setResolvedPrompt] = useState(prompt)
  const [memoryCount, setMemoryCount] = useState(0)
  const [recentMemories, setRecentMemories] = useState<ConversationMemory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    setResolvedPrompt(prompt)
  }, [prompt])

  useEffect(() => {
    let cancelled = false
    getCachedConversationContext(conversationId).then((cached) => {
      if (cancelled || !cached) return
      setResolvedPrompt(cached.prompt || prompt)
      setMemoryCount((cached.memories || []).length)
      setRecentMemories((cached.memories || []).slice(0, 2))
      setTasks(cached.tasks || [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [conversationId, prompt])

  useEffect(() => {
    let cancelled = false
    api.listMemories(token, conversationId).then((res) => {
      if (cancelled || !res.ok || !res.data) return
      const nextPrompt = res.data.prompt || ''
      const nextMemories = res.data.memories || []
      setResolvedPrompt(nextPrompt)
      setMemoryCount(nextMemories.length)
      setRecentMemories(nextMemories.slice(0, 2))
      void cacheConversationContext(conversationId, {
        prompt: nextPrompt,
        memories: nextMemories,
        tasks,
        updated_at: new Date().toISOString(),
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [token, conversationId, tasks])

  useEffect(() => {
    let cancelled = false
    api.listTasks(token, conversationId).then((res) => {
      if (cancelled || !res.ok || !res.data) return
      const nextTasks = res.data || []
      setTasks(nextTasks)
      void cacheConversationContext(conversationId, {
        prompt: resolvedPrompt,
        memories: recentMemories,
        tasks: nextTasks,
        updated_at: new Date().toISOString(),
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [token, conversationId, resolvedPrompt, recentMemories])

  const promptPreview = useMemo(() => truncate(resolvedPrompt), [resolvedPrompt])
  const hasContext = !!promptPreview || memoryCount > 0
  const openTaskCount = useMemo(() => tasks.filter((task) => task.status !== 'done').length, [tasks])
  const doneTaskCount = useMemo(() => tasks.filter((task) => task.status === 'done').length, [tasks])
  const canOpen = !!onOpenSettings || !!onOpenTasks

  if (!hasContext && tasks.length === 0) return null

  return (
    <button
      onClick={onOpenSettings || onOpenTasks}
      disabled={!canOpen}
      className="mx-4 mt-3 mb-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-left hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-[var(--color-bg-secondary)]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">{t('memory.contextTitle')}</span>
        </div>
        {canOpen ? <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> : null}
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
          {recentMemories.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {recentMemories.map((memory) => (
                <div key={memory.id} className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  <span className="font-medium text-[var(--color-text-secondary)]">{memory.key}</span>: {truncate(memory.content, 72)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="flex items-start gap-2.5 mt-2">
          <div className="w-6 h-6 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center flex-shrink-0">
            <ListTodo className="w-3 h-3 text-[var(--color-text-secondary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{t('memory.contextTasks')}</div>
            <div className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {t('memory.contextTaskSummary', { open: openTaskCount, done: doneTaskCount })}
            </div>
            {tasks[0]?.title && (
              <div className="mt-1.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                <span className="font-medium text-[var(--color-text-secondary)]">{t('memory.contextTopTask')}</span>: {tasks[0].title}
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  )
}
