import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as api from '@/lib/api'
import { Users, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

interface JoinInvitePageProps {
  code: string
  token: string
  onJoined: (conversationId: number) => void
  onCancel: () => void
}

export function JoinInvitePage({ code, token, onJoined, onCancel }: JoinInvitePageProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{
    conversation?: { id: number; title?: string; conv_type?: string }
    invite?: { code: string; use_count?: number; max_uses?: number; expires_at?: string }
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const res = await api.getInviteInfo(token, code)
      if (cancelled) return
      if (res.ok && res.data) {
        setInviteInfo(res.data as Record<string, unknown>)
      } else {
        setError(String(res.error || t('invite.invalidOrExpired')))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token, code, t])

  const handleJoin = async () => {
    setJoining(true)
    setError('')
    const res = await api.joinViaInvite(token, code)
    if (res.ok) {
      setJoined(true)
      // Use conversation ID from response (most reliable) or fallback to inviteInfo
      const convId = Number((res.data as Record<string, unknown>)?.id ?? inviteInfo?.conversation?.id)
      setTimeout(() => {
        if (convId) onJoined(convId)
      }, 1000)
    } else {
      setError(String(res.error || t('invite.joinFailed')))
    }
    setJoining(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
      <div className="w-full max-w-sm mx-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
              <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>
            </div>
          ) : error && !inviteInfo ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="w-10 h-10 text-[var(--color-error)]" />
              <p className="text-sm text-[var(--color-error)] text-center">{error}</p>
              <button
                onClick={onCancel}
                className="mt-2 px-4 py-2 text-sm rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
              >
                {t('legal.back')}
              </button>
            </div>
          ) : joined ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-10 h-10 text-[var(--color-success)]" />
              <p className="text-sm text-[var(--color-text-primary)] font-medium">{t('invite.joinedSuccess')}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-[var(--color-accent)]" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {inviteInfo?.conversation?.title || t('conversation.unnamed')}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {t('invite.invitedToJoin')}
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-xs text-[var(--color-error)] text-center">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {joining ? t('invite.joining') : t('invite.join')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
