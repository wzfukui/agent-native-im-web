import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import { getCachedEntities } from '@/lib/cache'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn, isBotOrService } from '@/lib/utils'
import { openOrCreateDirectConversation, shouldReuseDirectConversation } from '@/lib/direct-conversation'
import { X, Plus, Users, MessageSquare, Loader2, Check, Search, HeartHandshake, ChevronDown, Sparkles } from 'lucide-react'
import { useFocusTrap } from '@/lib/accessibility'

interface Props {
  onClose: () => void
  onCreated: (convId: number) => void
  preselectedEntityId?: number
}

export function NewConversationDialog({ onClose, onCreated, preselectedEntityId }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const conversations = useConversationsStore((s) => s.conversations)
  const addConversation = useConversationsStore((s) => s.addConversation)
  const [ownedBots, setOwnedBots] = useState<Entity[]>([])
  const [friends, setFriends] = useState<Entity[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set(preselectedEntityId ? [preselectedEntityId] : []))
  const [title, setTitle] = useState('')
  const [isGroup, setIsGroup] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef as React.RefObject<HTMLElement>, true)

  useEffect(() => {
    getCachedEntities().then((cached) => {
      if (cached.length > 0) {
        setOwnedBots(cached.filter((e) => e.id !== myEntity.id && e.entity_type !== 'user'))
      }
    })
    void Promise.all([api.listEntities(token), api.listFriends(token)]).then(([entitiesRes, friendsRes]) => {
      if (entitiesRes.ok && entitiesRes.data) {
        const all = Array.isArray(entitiesRes.data) ? entitiesRes.data : []
        setOwnedBots(all.filter((e) => e.id !== myEntity.id && e.entity_type !== 'user'))
      }
      if (friendsRes.ok && friendsRes.data) {
        setFriends(friendsRes.data.filter((e) => e.id !== myEntity.id))
      }
    }).catch(() => {})
  }, [myEntity.id, token])

  const directCandidates = useMemo(() => {
    const deduped = new Map<number, Entity>()
    for (const entity of [...friends, ...ownedBots]) deduped.set(entity.id, entity)
    return Array.from(deduped.values())
  }, [friends, ownedBots])

  const groupCandidates = directCandidates
  const filteredCandidates = (isGroup ? groupCandidates : directCandidates).filter((e) =>
    !search || entityDisplayName(e).toLowerCase().includes(search.toLowerCase()) || e.name?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    if (next.size > 1) setIsGroup(true)
  }

  const handleCreate = async () => {
    if (selected.size === 0) return
    setCreating(true)
    const selectedEntity = directCandidates.find((e) => selected.has(e.id))

    if (!isGroup && selectedEntity) {
      const conversation = await openOrCreateDirectConversation({
        token,
        t,
        myEntity,
        target: selectedEntity,
        conversations,
        addConversation,
      })
      if (conversation) onCreated(conversation.id)
      setCreating(false)
      return
    }

    const convTitle = title || `Group (${selected.size + 1} members)`

    const res = await api.createConversation(token, {
      title: convTitle,
      conv_type: isGroup ? 'group' : 'direct',
      participant_ids: Array.from(selected),
    })

    if (res.ok && res.data) {
      onCreated(res.data.id)
    }
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-conv-dialog-title"
        tabIndex={-1}
        className="w-full max-w-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 max-h-[78vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slide-up 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 id="new-conv-dialog-title" className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
            {t('conversation.newChat')}
          </h2>
          <button onClick={onClose} aria-label={t('a11y.closeDialog')} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!preselectedEntityId && (
            <details className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <summary className="list-none cursor-pointer px-3.5 py-3 text-sm font-medium text-[var(--color-text-primary)] flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  {t('newConversation.guideSummary')}
                </span>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3.5 pb-3 text-xs leading-5 text-[var(--color-text-secondary)] space-y-2">
                <p>{t('newConversation.guideBody')}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="rounded-lg bg-[var(--color-bg-primary)]/70 px-2.5 py-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{t('newConversation.directModeLabel')}</span>
                    <span className="block">{t('newConversation.directModeDesc')}</span>
                  </div>
                  <div className="rounded-lg bg-[var(--color-bg-primary)]/70 px-2.5 py-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{t('newConversation.groupModeLabel')}</span>
                    <span className="block">{t('newConversation.groupModeDesc')}</span>
                  </div>
                </div>
              </div>
            </details>
          )}

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsGroup(false)}
              className={cn(
                'flex-1 h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all border',
                !isGroup ? 'bg-[var(--color-accent-dim)] border-[var(--color-accent)]/40 text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]',
              )}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              {t('friends.directFromFriends')}
            </button>
            <button
              onClick={() => setIsGroup(true)}
              className={cn(
                'flex-1 h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all border',
                isGroup ? 'bg-[var(--color-accent-dim)] border-[var(--color-accent)]/40 text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]',
              )}
            >
              <Users className="w-3.5 h-3.5" />
              {t('conversation.group')}
            </button>
          </div>

          {/* Title (for groups) */}
          {isGroup && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('conversation.groupNamePlaceholder')}
              className="w-full h-9 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
          )}

          {!isGroup && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2.5 text-xs text-[var(--color-text-secondary)] flex items-start gap-2">
              <HeartHandshake className="w-3.5 h-3.5 mt-0.5 text-[var(--color-accent)] flex-shrink-0" />
              <span>{t('newConversation.directModeHelp')}</span>
            </div>
          )}

          {/* Participant list */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              {isGroup ? t('conversation.selectParticipants') : t('friends.selectFriendOrBot')}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('conversation.search')}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
              />
            </div>
            {filteredCandidates.map((entity) => (
              <button
                key={entity.id}
                onClick={() => toggleSelect(entity.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left',
                  selected.has(entity.id) ? 'bg-[var(--color-accent-dim)]' : 'hover:bg-[var(--color-bg-hover)]',
                )}
              >
                <EntityAvatar entity={entity} size="sm" showStatus />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] truncate">{entityDisplayName(entity)}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    {isGroup
                      ? (isBotOrService(entity) ? t('friends.yourBot') : t('friends.friend'))
                      : (shouldReuseDirectConversation(entity)
                        ? t('newConversation.directContinueLabel')
                        : t('newConversation.directNewThreadLabel'))}
                  </p>
                </div>
                {!isGroup && (
                  <span className="hidden sm:inline text-[10px] font-medium text-[var(--color-text-muted)]">
                    {shouldReuseDirectConversation(entity)
                      ? t('newConversation.openExistingShort')
                      : t('newConversation.newThreadShort')}
                  </span>
                )}
                <div className={cn(
                  'w-5 h-5 rounded-md border flex items-center justify-center transition-all',
                  selected.has(entity.id) ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border)]',
                )}>
                  {selected.has(entity.id) && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleCreate}
            disabled={creating || selected.size === 0}
            className="w-full h-10 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('conversation.create')} {isGroup ? t('conversation.group') : t('conversation.chat')}
          </button>
        </div>
      </div>
    </div>
  )
}
