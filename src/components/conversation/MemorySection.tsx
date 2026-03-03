import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import type { ConversationMemory } from '@/lib/types'
import { useMessagesStore } from '@/store/messages'
import {
  Plus, Trash2, Loader2, Brain, BarChart3, Eraser,
} from 'lucide-react'

interface Props {
  conversationId: number
  canManage: boolean
}

export function MemorySection({ conversationId, canManage }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!

  const messages = useMessagesStore((s) => s.byConv[conversationId] ?? [])
  const [memories, setMemories] = useState<ConversationMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Add/edit memory
  const [showForm, setShowForm] = useState(false)
  const [editKey, setEditKey] = useState('')
  const [editContent, setEditContent] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listMemories(token, conversationId)
      if (res.ok && res.data) {
        setMemories(res.data.memories || [])
      }
    } catch { /* network error */ }
    setLoading(false)
  }, [token, conversationId])

  useEffect(() => { load() }, [load])

  const handleSaveMemory = async () => {
    if (!editKey.trim() || !editContent.trim()) return
    setSaving(true)
    const res = await api.upsertMemory(token, conversationId, editKey.trim(), editContent.trim())
    if (res.ok) {
      setShowForm(false)
      setEditKey('')
      setEditContent('')
      load()
    }
    setSaving(false)
  }

  const handleDelete = async (memId: number) => {
    await api.deleteMemory(token, conversationId, memId)
    setMemories((prev) => prev.filter((m) => m.id !== memId))
  }

  const handleClearAll = async () => {
    setClearing(true)
    for (const mem of memories) {
      await api.deleteMemory(token, conversationId, mem.id)
    }
    setMemories([])
    setClearing(false)
  }

  // Approximate token count (rough: 1 token ≈ 4 chars for English, 1-2 for Chinese)
  const totalChars = messages.reduce((sum, m) => sum + (m.layers?.summary?.length || 0), 0)
  const approxTokens = Math.round(totalChars / 3)
  const memoryChars = memories.reduce((sum, m) => sum + m.key.length + m.content.length, 0)

  if (loading) {
    return (
      <div className="px-4 py-3 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-[var(--color-border)]">
      {/* Context stats */}
      <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)]">
        <BarChart3 className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
        <div className="flex-1 text-[10px] text-[var(--color-text-secondary)]">
          <span>{t('context.messages')}: <strong>{messages.length}</strong></span>
          <span className="mx-2">|</span>
          <span>{t('context.tokens')}: <strong>~{approxTokens.toLocaleString()}</strong></span>
          <span className="mx-2">|</span>
          <span>{t('memory.memories')}: <strong>{memories.length}</strong></span>
        </div>
      </div>

      {/* Memory list */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {t('memory.memories')} ({memories.length})
          </label>
          {canManage && (
            <button onClick={() => setShowForm(!showForm)} className="p-0.5 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer">
              <Plus className="w-3 h-3 text-[var(--color-accent)]" />
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-2 space-y-1.5 p-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)]">
            <input
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              placeholder={t('memory.keyPlaceholder')}
              className="w-full h-7 px-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-primary)] focus:outline-none"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={t('memory.contentPlaceholder')}
              rows={2}
              className="w-full px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-primary)] focus:outline-none resize-none"
            />
            <div className="flex gap-1">
              <button onClick={handleSaveMemory} disabled={saving} className="px-2 py-0.5 text-[10px] bg-[var(--color-accent)] text-white rounded cursor-pointer disabled:opacity-40">
                {t('common.save')}
              </button>
              <button onClick={() => setShowForm(false)} className="px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-1.5 space-y-1">
          {memories.map((mem) => (
            <div key={mem.id} className="flex items-start gap-2 py-1 group">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono font-medium text-[var(--color-accent)]">{mem.key}</span>
                <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">{mem.content}</p>
              </div>
              {canManage && (
                <button
                  onClick={() => handleDelete(mem.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--color-error)]/15 rounded cursor-pointer transition-opacity flex-shrink-0"
                >
                  <Trash2 className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Clear all memories */}
        {canManage && memories.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="mt-2 w-full py-1.5 rounded-lg border border-[var(--color-error)]/20 hover:bg-[var(--color-error)]/10 text-[var(--color-error)] text-[10px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
          >
            {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eraser className="w-3 h-3" />}
            {t('context.clearMemory')}
          </button>
        )}
      </div>
    </div>
  )
}
