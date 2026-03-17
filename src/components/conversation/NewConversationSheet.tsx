import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { getCachedEntities } from '@/lib/cache'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { entityDisplayName, isBotOrService, cn } from '@/lib/utils'
import { Bot, Users, Search, X, Check, Loader2, Plus, ArrowLeft, MessageSquare } from 'lucide-react'

type SheetStep = 'choose' | 'chat-with-bot' | 'create-group'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (convId: number) => void
  preselectedEntityId?: number
}

export function NewConversationSheet({ open, onClose, onCreated, preselectedEntityId }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<SheetStep>(preselectedEntityId ? 'create-group' : 'choose')
  const [search, setSearch] = useState('')
  const [groupTitle, setGroupTitle] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set(preselectedEntityId ? [preselectedEntityId] : []))
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // Schedule loading state asynchronously to satisfy React effect rules
    queueMicrotask(() => { if (!cancelled) setLoading(true) })
    // Show cached entities immediately, then refresh from network
    getCachedEntities().then((cached) => {
      if (cached.length > 0) {
        setEntities(cached.filter((e) => e.id !== myEntity.id))
        setLoading(false)
      }
    })
    api.listEntities(token).then((res) => {
      if (res.ok && res.data) {
        const all = Array.isArray(res.data) ? res.data : []
        setEntities(all.filter((e) => e.id !== myEntity.id))
      }
      setLoading(false)
    }).catch(() => {
      // Network failed — cached data remains visible
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, token, myEntity.id])

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(preselectedEntityId ? 'create-group' : 'choose')
        setSearch('')
        setGroupTitle('')
        setSelected(new Set(preselectedEntityId ? [preselectedEntityId] : []))
      }, 300)
    }
  }, [open, preselectedEntityId])

  const bots = useMemo(() => entities.filter((e) => isBotOrService(e)), [entities])
  const allFiltered = useMemo(() => {
    if (!search) return entities
    const q = search.toLowerCase()
    return entities.filter((e) =>
      entityDisplayName(e).toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    )
  }, [entities, search])

  const botsFiltered = useMemo(() => {
    if (!search) return bots
    const q = search.toLowerCase()
    return bots.filter((e) =>
      entityDisplayName(e).toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    )
  }, [bots, search])

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleChatWithBot = async (bot: Entity) => {
    setCreating(true)
    const res = await api.createConversation(token, {
      title: entityDisplayName(bot),
      conv_type: 'direct',
      participant_ids: [bot.id],
    })
    if (res.ok && res.data) {
      onCreated(res.data.id)
    }
    setCreating(false)
  }

  const handleCreateGroup = async () => {
    if (selected.size === 0) return
    setCreating(true)
    const title = groupTitle || `Group (${selected.size + 1} members)`
    const res = await api.createConversation(token, {
      title,
      conv_type: 'group',
      participant_ids: Array.from(selected),
    })
    if (res.ok && res.data) {
      onCreated(res.data.id)
    }
    setCreating(false)
  }

  const handleBack = () => {
    setStep('choose')
    setSearch('')
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Step: Choose action */}
      {step === 'choose' && (
        <div className="px-5 pb-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 text-center">
            {t('conversation.newChat')}
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => setStep('chat-with-bot')}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer min-h-[56px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-bot)]/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-[var(--color-bot)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('newConversation.chatWithBot')}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t('newConversation.chatWithBotDesc')}</p>
              </div>
            </button>
            <button
              onClick={() => setStep('create-group')}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer min-h-[56px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('newConversation.createGroup')}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t('newConversation.createGroupDesc')}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step: Chat with Bot */}
      {step === 'chat-with-bot' && (
        <div className="flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0">
            <button onClick={handleBack} className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t('newConversation.chatWithBot')}
            </h2>
          </div>

          {/* Search */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('bot.searchPlaceholder')}
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Bot list */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
              </div>
            ) : botsFiltered.length === 0 ? (
              <EmptyState
                icon={<Bot className="w-7 h-7" />}
                title={t('bot.noAgents')}
              />
            ) : (
              botsFiltered.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => handleChatWithBot(bot)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-left min-h-[52px]"
                >
                  <EntityAvatar entity={bot} size="md" showStatus />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(bot)}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">@{bot.name}</p>
                  </div>
                  <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step: Create Group */}
      {step === 'create-group' && (
        <div className="flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0">
            <button onClick={handleBack} className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex-1">
              {t('newConversation.createGroup')}
            </h2>
          </div>

          {/* Group title */}
          <div className="px-4 pb-3 flex-shrink-0">
            <input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder={t('conversation.groupNamePlaceholder')}
              className="w-full h-10 px-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
            />
          </div>

          {/* Selected badges */}
          {selected.size > 0 && (
            <div className="px-4 pb-3 flex gap-1.5 flex-wrap flex-shrink-0">
              {Array.from(selected).map((id) => {
                const entity = entities.find((e) => e.id === id)
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-accent)]/10 text-xs font-medium text-[var(--color-accent)]"
                  >
                    {entityDisplayName(entity)}
                    <button onClick={() => toggleSelect(id)} className="cursor-pointer hover:text-[var(--color-error)]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Search */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('conversation.search')}
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-0.5">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
              </div>
            ) : allFiltered.length === 0 ? (
              <EmptyState
                icon={<Users className="w-7 h-7" />}
                title={t('common.noEntities')}
              />
            ) : (
              allFiltered.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => toggleSelect(entity.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left min-h-[48px]',
                    selected.has(entity.id) ? 'bg-[var(--color-accent)]/8' : 'hover:bg-[var(--color-bg-hover)]',
                  )}
                >
                  <EntityAvatar entity={entity} size="sm" showStatus />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text-primary)] truncate">{entityDisplayName(entity)}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{entity.entity_type}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0',
                    selected.has(entity.id) ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border)]',
                  )}>
                    {selected.has(entity.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create button */}
          <div className="px-4 pb-6 pt-2 flex-shrink-0">
            <button
              onClick={handleCreateGroup}
              disabled={creating || selected.size === 0}
              className="w-full h-11 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[44px]"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t('newConversation.createGroupButton', { count: selected.size })}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
