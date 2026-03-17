import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import { getCachedEntities, cacheEntities } from '@/lib/cache'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { entityDisplayName, cn } from '@/lib/utils'
import { CreateBotDialog } from './CreateBotDialog'
import { Bot, Plus, Search, PowerOff } from 'lucide-react'

interface Props {
  selectedId: number | null
  onSelect: (id: number) => void
  onStartChat: (entityId: number) => void
  onCreated: (result: { entity: Entity; key: string; doc: string }) => void
  refreshTrigger?: number
}

export function BotList({ selectedId, onSelect, onCreated, refreshTrigger }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const online = usePresenceStore((s) => s.online)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { setOnline } = usePresenceStore()

  const fetchPresence = async (list: Entity[]) => {
    const botIds = list.filter((e) => e.entity_type !== 'user').map((e) => e.id)
    if (botIds.length > 0) {
      const presRes = await api.batchPresence(token, botIds)
      if (presRes.ok && presRes.data?.presence) {
        for (const [idStr, isOn] of Object.entries(presRes.data.presence)) {
          setOnline(Number(idStr), isOn as boolean)
        }
      }
    }
  }

  const loadEntities = async () => {
    try {
      const res = await api.listEntities(token)
      const list = res.ok && res.data ? (Array.isArray(res.data) ? res.data : []) : []
      setEntities(list)
      setLoading(false)

      // Cache entities for offline use
      if (list.length > 0) {
        cacheEntities(list)
      }

      // Fetch presence for all bot entities so the online dot is accurate
      await fetchPresence(list)
    } catch (error) {
      void error
      // Network failed — keep any cached data already displayed
      if (entities.length === 0) {
        setEntities([])
      }
    } finally {
      setLoading(false)
    }
  }

  // Stale-while-revalidate: show cached entities instantly, then refresh from network
  useEffect(() => {
    let cancelled = false
    getCachedEntities().then((cached) => {
      if (!cancelled && cached.length > 0) {
        setEntities(cached)
        setLoading(false)
      }
    })
    loadEntities()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadEntities depends on token which is stable after login
  }, [refreshTrigger])

  const bots = entities.filter((e) => e.entity_type !== 'user')
  const filtered = search
    ? bots.filter((e) =>
        e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.name?.toLowerCase().includes(search.toLowerCase())
      )
    : bots

  // Split into active and disabled groups, online bots sorted first
  const activeBots = filtered
    .filter((e) => e.status !== 'disabled')
    .sort((a, b) => (online.has(a.id) ? 0 : 1) - (online.has(b.id) ? 0 : 1))
  const disabledBots = filtered.filter((e) => e.status === 'disabled')

  const renderBotItem = (entity: Entity, isDisabled: boolean) => {
    const isOnline = online.has(entity.id)
    const isActive = entity.id === selectedId
    const meta = entity.metadata as Record<string, unknown> | undefined
    const tags = Array.isArray(meta?.tags) ? (meta.tags as string[]) : []
    const description = (meta?.description as string) || ''
    return (
      <button
        key={entity.id}
        onClick={() => onSelect(entity.id)}
        className={cn(
          'w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer',
          isActive
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)] shadow-sm'
            : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]/30 hover:bg-[var(--color-bg-hover)]',
          isDisabled && 'opacity-50'
        )}
      >
        <div className="relative flex-shrink-0">
          <EntityAvatar entity={entity} size="md" />
          {/* Online status dot */}
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--color-bg-secondary)]',
            isDisabled
              ? 'bg-[var(--color-warning)]'
              : isOnline
                ? 'bg-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/50'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {entityDisplayName(entity)}
            </p>
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[9px] font-medium flex-shrink-0',
              isDisabled
                ? 'bg-[var(--color-warning)]/12 text-[var(--color-warning)]'
                : isOnline
                  ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]'
                  : 'bg-[var(--color-text-muted)]/12 text-[var(--color-text-muted)]'
            )}>
              {isDisabled ? t('bot.disabled') : isOnline ? t('common.online') : t('common.offline')}
            </span>
          </div>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{description}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-md bg-[var(--color-bot)]/8 text-[var(--color-bot)] text-[9px]">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[9px] text-[var(--color-text-muted)]">+{tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4.5 h-4.5 text-[var(--color-bot)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('bot.agents')}</h2>
          <span className="text-xs text-[var(--color-text-muted)]">({activeBots.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-xl bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 flex items-center justify-center transition-colors cursor-pointer min-w-[36px]"
        >
          <Plus className="w-4.5 h-4.5 text-[var(--color-accent)]" />
        </button>
      </div>

      {/* Create bot dialog */}
      {showCreate && (
        <CreateBotDialog
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setShowCreate(false)
            loadEntities()
            onSelect(result.entity.id)
            onCreated(result)
          }}
        />
      )}

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('bot.searchPlaceholder')}
            className="w-full h-8 pl-8.5 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Bot list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <SkeletonLoader variant="bot-list" />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">{search ? t('common.noMatches') : t('bot.noAgents')}</p>
          </div>
        ) : (
          <>
            {/* Active bots (online first) — card grid, 2-col on desktop */}
            <div className="grid grid-cols-1 gap-2">
              {activeBots.map((entity) => renderBotItem(entity, false))}
            </div>

            {/* Divider + Disabled bots */}
            {disabledBots.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 py-3 mt-2">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                    <PowerOff className="w-2.5 h-2.5" />
                    {t('bot.disabledSection')} ({disabledBots.length})
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {disabledBots.map((entity) => renderBotItem(entity, true))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
