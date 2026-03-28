import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { useNotificationsStore } from '@/store/notifications'
import * as api from '@/lib/api'
import type { Entity, FriendRequest } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { EntityPopoverCard } from '@/components/entity/EntityPopoverCard'
import { entityDisplayName, cn } from '@/lib/utils'
import { openOrCreateDirectConversation, conversationRouteFor } from '@/lib/direct-conversation'
import { Loader2, Search, UserPlus, UserCheck, X, Users, SendHorizonal, MessageSquare } from 'lucide-react'

type Tab = 'friends' | 'requests'

export function FriendsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)!
  const me = useAuthStore((s) => s.entity)!
  const conversations = useConversationsStore((s) => s.conversations)
  const addConversation = useConversationsStore((s) => s.addConversation)
  const [tab, setTab] = useState<Tab>('friends')
  const [actingEntityId, setActingEntityId] = useState<number>(me.id)
  const [ownedBots, setOwnedBots] = useState<Entity[]>([])
  const [friends, setFriends] = useState<Entity[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [discoverable, setDiscoverable] = useState<Entity[]>([])
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [popoverEntity, setPopoverEntity] = useState<Entity | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const inboxDirtyVersion = useNotificationsStore((s) => s.dirtyVersion)

  const actingOptions = useMemo(() => [me, ...ownedBots], [me, ownedBots])
  const actingEntity = actingOptions.find((item) => item.id === actingEntityId) || me

  const loadOwnedBots = useCallback(async () => {
    const res = await api.listEntities(token)
    if (res.ok && res.data) {
      setOwnedBots((res.data || []).filter((entity) => entity.entity_type !== 'user'))
    }
  }, [token])

  const loadSocial = useCallback(async () => {
    setLoading(true)
    const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
      api.listFriends(token, actingEntityId),
      api.listFriendRequests(token, { entityId: actingEntityId, direction: 'incoming', status: 'pending' }),
      api.listFriendRequests(token, { entityId: actingEntityId, direction: 'outgoing', status: 'pending' }),
    ])
    if (friendsRes.ok && friendsRes.data) setFriends(friendsRes.data)
    if (incomingRes.ok && incomingRes.data) setIncoming(incomingRes.data)
    if (outgoingRes.ok && outgoingRes.data) setOutgoing(outgoingRes.data)
    setLoading(false)
  }, [actingEntityId, token])

  useEffect(() => {
    void loadOwnedBots()
  }, [loadOwnedBots])

  useEffect(() => {
    void loadSocial()
  }, [inboxDirtyVersion, loadSocial])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return
      void loadSocial()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [loadSocial])

  const runSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchedQuery('')
      setDiscoverable([])
      return
    }
    setSearching(true)
    setSearchedQuery(trimmed)
    const res = await api.searchDiscoverableEntities(token, trimmed, 20)
    if (res.ok && res.data) {
      setDiscoverable(res.data.filter((entity) => entity.id !== actingEntityId))
    } else {
      setDiscoverable([])
    }
    setSearching(false)
  }, [actingEntityId, query, token])

  const outgoingTargets = new Set(outgoing.map((req) => req.target_entity_id))
  const friendIds = new Set(friends.map((entity) => entity.id))

  const sendRequest = useCallback(async (targetId: number) => {
    setSubmittingId(targetId)
    await api.createFriendRequest(token, {
      source_entity_id: actingEntityId === me.id ? undefined : actingEntityId,
      target_entity_id: targetId,
    })
    setSubmittingId(null)
    await loadSocial()
    setQuery('')
    setSearchedQuery('')
    setDiscoverable([])
  }, [actingEntityId, loadSocial, me.id, token])

  const acceptRequest = useCallback(async (id: number) => {
    setSubmittingId(id)
    await api.acceptFriendRequest(token, id, actingEntityId === me.id ? undefined : actingEntityId)
    setSubmittingId(null)
    await loadSocial()
  }, [actingEntityId, loadSocial, me.id, token])

  const rejectRequest = useCallback(async (id: number) => {
    setSubmittingId(id)
    await api.rejectFriendRequest(token, id, actingEntityId === me.id ? undefined : actingEntityId)
    setSubmittingId(null)
    await loadSocial()
  }, [actingEntityId, loadSocial, me.id, token])

  const cancelRequest = useCallback(async (id: number) => {
    setSubmittingId(id)
    await api.cancelFriendRequest(token, id, actingEntityId === me.id ? undefined : actingEntityId)
    setSubmittingId(null)
    await loadSocial()
  }, [actingEntityId, loadSocial, me.id, token])

  const removeFriend = useCallback(async (id: number) => {
    setSubmittingId(id)
    await api.deleteFriend(token, id, actingEntityId === me.id ? undefined : actingEntityId)
    setSubmittingId(null)
    await loadSocial()
  }, [actingEntityId, loadSocial, me.id, token])

  const handleOpenDirect = useCallback(async (target: Entity) => {
    setSubmittingId(target.id)
    const conversation = await openOrCreateDirectConversation({
      token,
      t,
      myEntity: me,
      target,
      conversations,
      addConversation,
    })
    setSubmittingId(null)
    if (!conversation) return
    navigate(conversationRouteFor(conversation))
  }, [addConversation, conversations, me, navigate, t, token])

  return (
    <div className="h-full min-h-0 flex flex-col bg-[var(--color-bg-primary)]">
      <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('friends.title')}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{t('friends.subtitle')}</p>
          </div>
          <select
            value={actingEntityId}
            onChange={(e) => setActingEntityId(Number(e.target.value))}
            className="h-10 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none"
          >
            {actingOptions.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.id === me.id ? t('friends.actAsSelf', { name: entityDisplayName(entity) }) : t('friends.actAsBot', { name: entityDisplayName(entity) })}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void runSearch()
              }
            }}
            placeholder={t('friends.searchPlaceholder')}
            className="w-full h-11 pl-10 pr-28 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
          />
          <button
            onClick={() => void runSearch()}
            disabled={searching || !query.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {t('friends.searchAction')}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t('friends.searchHelp')}</p>

        {searchedQuery && (
          <div className="mt-3 grid gap-2">
            {discoverable.length === 0 ? (
              <div className="px-4 py-3 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                {t('friends.noResults')}
              </div>
            ) : (
              discoverable.map((entity) => {
                const pending = outgoingTargets.has(entity.id)
                const isFriend = friendIds.has(entity.id)
                return (
                  <div key={entity.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
                    <EntityAvatar entity={entity} size="sm" showStatus />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(entity)}</div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">{entity.bot_id || entity.public_id || `@${entity.name}`}</div>
                    </div>
                    {isFriend ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
                        <UserCheck className="w-3.5 h-3.5" />
                        {t('friends.friend')}
                      </span>
                    ) : pending ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
                        <SendHorizonal className="w-3.5 h-3.5" />
                        {t('friends.requestSent')}
                      </span>
                    ) : (
                      <button
                        onClick={() => void sendRequest(entity.id)}
                        disabled={submittingId === entity.id}
                        className="h-9 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {submittingId === entity.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        {t('friends.add')}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      <div className="px-6 pt-4">
        <div className="inline-flex rounded-2xl bg-[var(--color-bg-secondary)] p-1 border border-[var(--color-border)]">
          {(['friends', 'requests'] as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'h-9 px-4 rounded-xl text-sm font-medium cursor-pointer transition-colors',
                tab === key ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {key === 'friends' ? t('friends.friendsTab', { count: friends.length }) : t('friends.requestsTab', { count: incoming.length + outgoing.length })}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" /></div>
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Users className="w-9 h-9 text-[var(--color-text-muted)] mb-3" />
              <div className="text-sm font-medium text-[var(--color-text-primary)]">{t('friends.emptyTitle')}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">{t('friends.emptyDesc')}</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {friends.map((entity) => (
                <div key={entity.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <EntityAvatar entity={entity} size="sm" showStatus />
                  <button
                    onClick={(e) => {
                      setPopoverEntity(entity)
                      setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())
                    }}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(entity)}</div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">{entity.bot_id || entity.public_id || `@${entity.name}`}</div>
                  </button>
                  <button
                    onClick={() => void handleOpenDirect(entity)}
                    disabled={submittingId === entity.id}
                    className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingId === entity.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {t('friends.message')}
                  </button>
                  <button
                    onClick={() => void removeFriend(entity.id)}
                    disabled={submittingId === entity.id}
                    className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('friends.remove')}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="grid gap-6">
            <section>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">{t('friends.incoming')}</div>
              <div className="grid gap-3">
                {incoming.length === 0 ? (
                  <div className="px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">{t('friends.noIncoming')}</div>
                ) : incoming.map((request) => (
                  <div key={request.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <EntityAvatar entity={request.source_entity} size="sm" showStatus />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(request.source_entity)}</div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">{request.source_entity?.bot_id || request.source_entity?.public_id || `@${request.source_entity?.name}`}</div>
                    </div>
                    <button onClick={() => void acceptRequest(request.id)} disabled={submittingId === request.id} className="h-9 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium cursor-pointer">{t('friends.accept')}</button>
                    <button onClick={() => void rejectRequest(request.id)} disabled={submittingId === request.id} className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] cursor-pointer">{t('friends.reject')}</button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">{t('friends.outgoing')}</div>
              <div className="grid gap-3">
                {outgoing.length === 0 ? (
                  <div className="px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">{t('friends.noOutgoing')}</div>
                ) : outgoing.map((request) => (
                  <div key={request.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <EntityAvatar entity={request.target_entity} size="sm" showStatus />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(request.target_entity)}</div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">{request.target_entity?.bot_id || request.target_entity?.public_id || `@${request.target_entity?.name}`}</div>
                    </div>
                    <button onClick={() => void cancelRequest(request.id)} disabled={submittingId === request.id} className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] cursor-pointer inline-flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      {t('friends.cancel')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {popoverEntity && popoverAnchor && (
        <EntityPopoverCard
          entity={popoverEntity}
          anchorRect={popoverAnchor}
          onClose={() => { setPopoverEntity(null); setPopoverAnchor(null) }}
          onSendMessage={(entity) => { void handleOpenDirect(entity) }}
          onViewDetails={(entity) => navigate(entity.bot_id || entity.public_id ? `/bots/public/${encodeURIComponent(entity.bot_id || entity.public_id!)}` : `/bots/${entity.id}`)}
        />
      )}
    </div>
  )
}
