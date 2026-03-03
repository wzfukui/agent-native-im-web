import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import type { Entity } from '@/lib/types'
import { extractError, reportError } from '@/lib/errors'
import { AvatarPicker } from './AvatarPicker'
import { X, Plus, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: (result: { entity: Entity; key: string; doc: string }) => void
}

export function CreateAgentDialog({ onClose, onCreated }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      // Build metadata for single-call creation
      const meta: Record<string, unknown> = {}
      if (description.trim()) meta.description = description.trim()
      if (tags.trim()) meta.tags = tags.split(',').map((v) => v.trim()).filter(Boolean)

      const res = await api.createEntity(
        token, name.trim(),
        Object.keys(meta).length > 0 ? meta : undefined,
      )
      if (res.ok && res.data) {
        let entity = res.data.entity
        // Set avatar if one was selected
        if (avatarUrl) {
          const avatarRes = await api.updateEntity(token, entity.id, { avatar_url: avatarUrl })
          if (avatarRes.ok && avatarRes.data) entity = avatarRes.data
        }
        onCreated({ entity, key: res.data.bootstrap_key, doc: res.data.markdown_doc })
      } else {
        const parsed = extractError(res)
        setError(parsed.message)
        reportError(parsed) // show ErrorToast with full diagnostic info
      }
    } catch {
      setError(t('common.error'))
    }
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slide-up 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('bot.createAgent')}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3">
          {/* Avatar + Name row */}
          <div className="flex items-end gap-3">
            <AvatarPicker currentUrl={avatarUrl} onSelect={setAvatarUrl} size="sm" />
            <div className="flex-1">
              <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('bot.agentName')} *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder={t('bot.namePlaceholder')}
                autoFocus
                className="w-full h-9 mt-1 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-bot)]/50 transition-colors"
              />
            </div>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('bot.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('bot.descriptionPlaceholder')}
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-bot)]/50 resize-none transition-colors"
            />
          </div>

          {/* Tags (optional) */}
          <div>
            <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('bot.tagsLabel')}</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('bot.tagsPlaceholder')}
              className="w-full h-9 mt-1 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-bot)]/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-[11px] text-[var(--color-error)]">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-bot)] hover:bg-[var(--color-bot)]/80 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
