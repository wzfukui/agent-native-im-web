import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import type { Entity, Conversation, AdminStats } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { cn } from '@/lib/utils'
import {
  Users, MessageSquare, BarChart3, Bot, Wifi, RefreshCw,
  ChevronLeft, ChevronRight, Trash2, ArrowLeft,
} from 'lucide-react'

type Tab = 'dashboard' | 'users' | 'conversations'

interface Props {
  onBack: () => void
}

export function AdminPanel({ onBack }: Props) {
  const token = useAuthStore((s) => s.token)!
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Admin Panel</h1>
        <div className="flex-1" />
        <div className="flex gap-1">
          {(['dashboard', 'users', 'conversations'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                tab === t
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              {t === 'dashboard' ? 'Dashboard' : t === 'users' ? 'Users' : 'Conversations'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'dashboard' && <DashboardTab token={token} />}
        {tab === 'users' && <UsersTab token={token} />}
        {tab === 'conversations' && <ConversationsTab token={token} />}
      </div>
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────
function DashboardTab({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.adminGetStats(token)
    if (res.ok && res.data) setStats(res.data)
    setLoading(false)
  }, [token])

  useEffect(() => {
    let cancelled = false
    api.adminGetStats(token).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) setStats(res.data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [token])

  if (loading) return <div className="text-sm text-[var(--color-text-muted)]">Loading...</div>
  if (!stats) return <div className="text-sm text-[var(--color-text-muted)]">Failed to load stats</div>

  const cards = [
    { label: 'Users', value: stats.user_count, icon: Users, color: 'var(--color-accent)' },
    { label: 'Bots', value: stats.bot_count, icon: Bot, color: 'var(--color-bot)' },
    { label: 'Conversations', value: stats.conversation_count, icon: MessageSquare, color: 'var(--color-success)' },
    { label: 'Messages', value: stats.message_count, icon: BarChart3, color: '#f59e0b' },
    { label: 'WS Connections', value: stats.ws_connections, icon: Wifi, color: '#06b6d4' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">System Overview</h2>
        <button onClick={load} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────
function UsersTab({ token }: { token: string }) {
  const [entities, setEntities] = useState<(Entity & { online: boolean })[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.adminListUsers(token, limit, offset)
    if (res.ok && res.data) {
      setEntities(res.data.entities || [])
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [token, offset])

  useEffect(() => {
    let cancelled = false
    api.adminListUsers(token, limit, offset).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) {
        setEntities(res.data.entities || [])
        setTotal(res.data.total)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [token, offset])

  const handleDelete = async (id: number) => {
    const res = await api.adminDeleteUser(token, id)
    if (res.ok) load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          All Entities ({total})
        </h2>
        <button onClick={load} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--color-text-muted)]">Loading...</div>
      ) : (
        <div className="space-y-1">
          {entities.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] group">
              <EntityAvatar entity={e} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{e.display_name || e.name}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    e.entity_type === 'user' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : e.entity_type === 'bot' ? 'bg-[var(--color-bot)]/15 text-[var(--color-bot)]'
                        : 'bg-gray-500/15 text-gray-400'
                  )}>{e.entity_type}</span>
                  {e.online && <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  @{e.name} · {e.status} · ID: {e.id}
                </p>
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--color-danger)]/15 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete entity"
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Conversations Tab ────────────────────────────────────────
function ConversationsTab({ token }: { token: string }) {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.adminListConversations(token, limit, offset)
    if (res.ok && res.data) {
      setConvs(res.data.conversations || [])
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [token, offset])

  useEffect(() => {
    let cancelled = false
    api.adminListConversations(token, limit, offset).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) {
        setConvs(res.data.conversations || [])
        setTotal(res.data.total)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [token, offset])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          All Conversations ({total})
        </h2>
        <button onClick={load} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--color-text-muted)]">Loading...</div>
      ) : (
        <div className="space-y-1">
          {convs.map((conv) => (
            <div key={conv.id} className="px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {conv.title || `Conversation #${conv.id}`}
                </span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  conv.conv_type === 'group' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                    : conv.conv_type === 'channel' ? 'bg-[var(--color-bot)]/15 text-[var(--color-bot)]'
                      : 'bg-gray-500/15 text-gray-400'
                )}>{conv.conv_type}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 ml-6">
                ID: {conv.id} · {conv.participants?.length || 0} participants · updated {new Date(conv.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
      )}
    </div>
  )
}
