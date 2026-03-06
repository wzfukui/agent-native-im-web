import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import { CreateAgentDialog } from './CreateAgentDialog'
import { Bot, Plus, Search, Loader2, Wifi, WifiOff, PowerOff } from 'lucide-react'

interface Props {
  selectedId: number | null
  onSelect: (id: number) => void
  onStartChat: (entityId: number) => void
  onCreated: (result: { entity: Entity; key: string; doc: string }) => void
  refreshTrigger?: number
}

export function BotList({ selectedId, onSelect, onStartChat, onCreated, refreshTrigger }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const online = usePresenceStore((s) => s.online)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const loadEntities = async () => {
    try {
      const res = await api.listEntities(token)
      if (res.ok && res.data) setEntities(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to load entities:', error)
      setEntities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEntities() }, [refreshTrigger])

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
    return (
      <button
        key={entity.id}
        onClick={() => onSelect(entity.id)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left cursor-pointer',
          isActive
            ? 'bg-[var(--color-accent-dim)]'
            : 'hover:bg-[var(--color-bg-hover)]',
          isDisabled && 'opacity-50'
        )}
      >
        <EntityAvatar entity={entity} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {entityDisplayName(entity)}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
            {isDisabled ? (
              <><PowerOff className="w-2.5 h-2.5" /> {t('bot.disabled')}</>
            ) : isOnline ? (
              <><Wifi className="w-2.5 h-2.5 text-[var(--color-success)]" /> {t('common.online')}</>
            ) : (
              <><WifiOff className="w-2.5 h-2.5" /> {t('common.offline')}</>
            )}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-0.5">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-1 py-px rounded bg-[var(--color-bot)]/8 text-[var(--color-bot)] text-[9px]">
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
          className="w-8 h-8 rounded-lg bg-[var(--color-bot)]/10 hover:bg-[var(--color-bot)]/20 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[var(--color-bot)]" />
        </button>
      </div>

      {/* Create agent dialog */}
      {showCreate && (
        <CreateAgentDialog
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
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">{search ? t('common.noMatches') : t('bot.noAgents')}</p>
          </div>
        ) : (
          <>
            {/* Active bots (online first) */}
            {activeBots.map((entity) => renderBotItem(entity, false))}

            {/* Divider + Disabled bots */}
            {disabledBots.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 py-2 mt-1">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                    <PowerOff className="w-2.5 h-2.5" />
                    {t('bot.disabledSection')} ({disabledBots.length})
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                {disabledBots.map((entity) => renderBotItem(entity, true))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
