import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { Pencil, Loader2, Terminal } from 'lucide-react'

interface Props {
  conversationId: number
  canManage: boolean
}

export function AgentConfigSection({ conversationId, canManage }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!

  const [prompt, setPrompt] = useState('')
  const [editing, setEditing] = useState(false)
  const [promptValue, setPromptValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listMemories(token, conversationId)
      if (res.ok && res.data) {
        setPrompt(res.data.prompt || '')
      }
    } catch { /* network error */ }
    setLoading(false)
  }, [token, conversationId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.updateConversation(token, conversationId, { prompt: promptValue })
      if (res.ok) {
        setPrompt(promptValue)
        setEditing(false)
      }
    } catch { /* network error */ }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="px-4 py-3 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-[var(--color-border)]">
      <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
        <Terminal className="w-3 h-3" /> {t('agentConfig.prompt')}
      </label>
      {editing ? (
        <div className="mt-1 space-y-1">
          <textarea
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            rows={3}
            className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-accent)]/50 text-xs text-[var(--color-text-primary)] focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving} className="px-2 py-1 text-[10px] bg-[var(--color-accent)] text-white rounded cursor-pointer">
              {t('common.save')}
            </button>
            <button onClick={() => setEditing(false)} className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 mt-1 group">
          <p className="text-xs text-[var(--color-text-secondary)] flex-1 leading-relaxed whitespace-pre-wrap">
            {prompt || t('agentConfig.noPrompt')}
          </p>
          {canManage && (
            <button onClick={() => { setPromptValue(prompt); setEditing(true) }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-opacity flex-shrink-0">
              <Pencil className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
