import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { getGatewayUrl } from '@/lib/gateway'
import { Link, Copy, Trash2, Plus, Check, Loader2 } from 'lucide-react'

interface InviteLink {
  id: number
  code: string
  use_count: number
  max_uses: number
  expires_at?: string
}

interface Props {
  conversationId: number
}

export function InviteLinkSection({ conversationId }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!

  const [links, setLinks] = useState<InviteLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.listInviteLinks(token, conversationId)
    if (res.ok && res.data) {
      setLinks(Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [token, conversationId])

  useEffect(() => {
    let cancelled = false
    api.listInviteLinks(token, conversationId).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) setLinks(Array.isArray(res.data) ? res.data : [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [token, conversationId])

  const handleCreate = async () => {
    setCreating(true)
    const res = await api.createInviteLink(token, conversationId, { max_uses: 0, expires_in: 86400 * 7 })
    if (res.ok) load()
    setCreating(false)
  }

  const handleDelete = async (id: number) => {
    await api.deleteInviteLink(token, id)
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  const handleCopy = (link: InviteLink) => {
    const url = `${getGatewayUrl()}/join/${link.code}`
    navigator.clipboard.writeText(url)
    setCopied(link.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
          <Link className="w-3 h-3" /> {t('invite.title')}
        </label>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="p-0.5 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer"
        >
          {creating ? <Loader2 className="w-3 h-3 animate-spin text-[var(--color-accent)]" /> : <Plus className="w-3 h-3 text-[var(--color-accent)]" />}
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)] mx-auto" />
      ) : links.length === 0 ? (
        <p className="text-[10px] text-[var(--color-text-muted)]">{t('invite.noLinks')}</p>
      ) : (
        <div className="space-y-1.5">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)]">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-[var(--color-text-primary)] truncate">{link.code}</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">
                  {t('invite.uses', { count: link.use_count, max: link.max_uses || '∞' })}
                  {link.expires_at && ` · ${t('invite.expires', { date: new Date(link.expires_at).toLocaleDateString() })}`}
                </p>
              </div>
              <button
                onClick={() => handleCopy(link)}
                className="p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer"
              >
                {copied === link.id ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />}
              </button>
              <button
                onClick={() => handleDelete(link.id)}
                className="p-1 hover:bg-[var(--color-error)]/15 rounded cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-[var(--color-text-muted)]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
