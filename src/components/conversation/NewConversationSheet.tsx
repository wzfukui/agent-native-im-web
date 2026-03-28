import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import { getCachedEntities } from '@/lib/cache'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { entityDisplayName, isBotOrService, cn } from '@/lib/utils'
import { openOrCreateDirectConversation, shouldReuseDirectConversation } from '@/lib/direct-conversation'
import { Users, Search, X, Check, Loader2, Plus, ArrowLeft, MessageSquare, HeartHandshake, ChevronDown, Sparkles } from 'lucide-react'

type SheetStep = 'choose' | 'direct-chat' | 'create-group'

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
  const conversations = useConversationsStore((s) => s.conversations)
  const addConversation = useConversationsStore((s) => s.addConversation)
  const [ownedBots, setOwnedBots] = useState<Entity[]>([])
  const [friends, setFriends] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<SheetStep>(preselectedEntityId ? 'direct-chat' : 'choose')
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
        setOwnedBots(cached.filter((e) => e.id !== myEntity.id && e.entity_type !== 'user'))
        setLoading(false)
      }
    })
    Promise.all([api.listEntities(token), api.listFriends(token)]).then(([entitiesRes, friendsRes]) => {
      if (entitiesRes.ok && entitiesRes.data) {
        const all = Array.isArray(entitiesRes.data) ? entitiesRes.data : []
        setOwnedBots(all.filter((e) => e.id !== myEntity.id && e.entity_type !== 'user'))
      }
      if (friendsRes.ok && friendsRes.data) {
        setFriends(friendsRes.data.filter((e) => e.id !== myEntity.id))
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
        setStep(preselectedEntityId ? 'direct-chat' : 'choose')
        setSearch('')
        setGroupTitle('')
        setSelected(new Set(preselectedEntityId ? [preselectedEntityId] : []))
      }, 300)
    }
  }, [open, preselectedEntityId])

  const directCandidates = useMemo(() => {
    const deduped = new Map<number, Entity>()
    for (const entity of [...friends, ...ownedBots]) deduped.set(entity.id, entity)
    return Array.from(deduped.values())
  }, [friends, ownedBots])

  const allFiltered = useMemo(() => {
    if (!search) return directCandidates
    const q = search.toLowerCase()
    return directCandidates.filter((e) =>
      entityDisplayName(e).toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    )
  }, [directCandidates, search])

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleOpenDirect = async (target: Entity) => {
    setCreating(true)
    const conversation = await openOrCreateDirectConversation({
      token,
      t,
      myEntity,
      target,
      conversations,
      addConversation,
    })
    if (conversation) onCreated(conversation.id)
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
          {!preselectedEntityId && (
            <details className="group mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <summary className="list-none cursor-pointer px-3.5 py-3 text-sm font-medium text-[var(--color-text-primary)] flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  {t('newConversation.guideSummary')}
                </span>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3.5 pb-3 text-xs leading-5 text-[var(--color-text-secondary)] space-y-2">
                <p>{t('newConversation.guideBody')}</p>
              </div>
            </details>
          )}
          <div className="space-y-2">
            <button
              onClick={() => setStep('direct-chat')}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer min-h-[56px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-bot)]/15 flex items-center justify-center flex-shrink-0">
                <HeartHandshake className="w-5 h-5 text-[var(--color-bot)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('friends.directFromFriends')}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{t('newConversation.directModeHelp')}</p>
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

      {/* Step: Direct chat */}
      {step === 'direct-chat' && (
        <div className="flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0">
            <button onClick={handleBack} className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t('friends.directFromFriends')}
            </h2>
          </div>

          {/* Search */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('friends.selectFriendOrBot')}
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {!preselectedEntityId && (
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2.5 text-xs text-[var(--color-text-secondary)] flex items-start gap-2">
                <HeartHandshake className="w-3.5 h-3.5 mt-0.5 text-[var(--color-accent)] flex-shrink-0" />
                <span>{t('newConversation.directModeHelp')}</span>
              </div>
            </div>
          )}

          {/* Candidate list */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
              </div>
            ) : allFiltered.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="w-7 h-7" />}
                title={t('friends.noDirectCandidates')}
              />
            ) : (
              allFiltered.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => void handleOpenDirect(entity)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer text-left min-h-[52px]"
                >
                  <EntityAvatar entity={entity} size="md" showStatus />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(entity)}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {shouldReuseDirectConversation(entity)
                        ? t('newConversation.directContinueLabel')
                        : t('newConversation.directNewThreadLabel')}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)] text-right">
                    {shouldReuseDirectConversation(entity)
                      ? t('newConversation.openExistingShort')
                      : t('newConversation.newThreadShort')}
                  </span>
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
                const entity = directCandidates.find((e) => e.id === id)
                if (!entity) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-accent)]/10 text-xs font-medium text-[var(--color-accent)]"
                  >
                    {entityDisplayName(entity)}
                    <button type="button" onClick={() => toggleSelect(id)} className="cursor-pointer hover:text-[var(--color-error)]">
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
              <EmptyState icon={<Users className="w-7 h-7" />} title={t('friends.noGroupCandidates')} />
            ) : (
              allFiltered.map((entity) => (
                <button
                  type="button"
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
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {isBotOrService(entity) ? t('friends.yourBot') : t('friends.friend')}
                    </p>
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
