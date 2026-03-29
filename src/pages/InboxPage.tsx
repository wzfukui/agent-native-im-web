import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Loader2, MessageCircleMore, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useNotificationsStore } from '@/store/notifications'
import * as api from '@/lib/api'
import type { Entity, NotificationRecord } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { cn, entityDisplayName } from '@/lib/utils'

type Scope = 'all' | string
type Filter = 'all' | 'unread'

function notificationRequestId(notification: NotificationRecord): number | null {
  const raw = notification.data?.request_id
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  return null
}

function notificationRecipientEntityId(notification: NotificationRecord): number {
  return notification.recipient_entity?.id || notification.recipient_entity_id
}

function notificationConversationId(notification: NotificationRecord): number | null {
  const raw = notification.data?.conversation_id
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  return null
}

function notificationConversationPublicId(notification: NotificationRecord): string {
  const raw = notification.data?.conversation_public_id
  return typeof raw === 'string' ? raw : ''
}

function notificationConversationPath(notification: NotificationRecord): string | null {
  const publicId = notificationConversationPublicId(notification)
  if (publicId) return `/chat/${encodeURIComponent(publicId)}`
  const numericId = notificationConversationId(notification)
  if (numericId != null) return `/chat/${numericId}`
  return null
}

function notificationLabel(t: (key: string, options?: Record<string, unknown>) => string, notification: NotificationRecord): string {
  const actor = notification.actor_entity ? entityDisplayName(notification.actor_entity) : t('inbox.someone')
  switch (notification.kind) {
    case 'friend.request.received':
      return t('inbox.friendRequestReceived', { actor })
    case 'friend.request.accepted':
      return t('inbox.friendRequestAccepted', { actor })
    case 'friend.request.rejected':
      return t('inbox.friendRequestRejected', { actor })
    case 'friend.request.canceled':
      return t('inbox.friendRequestCanceled', { actor })
    case 'invite.joined':
      return t('inbox.inviteJoined', { actor })
    case 'conversation.change_request':
      return t('inbox.changeRequested', { actor })
    case 'conversation.change_approved':
      return t('inbox.changeApproved', { actor })
    case 'conversation.change_rejected':
      return t('inbox.changeRejected', { actor })
    case 'task.handover':
      return t('inbox.taskHandover', { actor })
    case 'public.bot_session_created':
      return t('inbox.publicBotSessionCreated')
    default:
      return notification.title || t('inbox.generic')
  }
}

export function InboxPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)!
  const me = useAuthStore((s) => s.entity)!
  const actingEntities = useNotificationsStore((s) => s.actingEntities)
  const notifications = useNotificationsStore((s) => s.notifications)
  const applyNotificationRead = useNotificationsStore((s) => s.applyNotificationRead)
  const applyNotificationReadAll = useNotificationsStore((s) => s.applyNotificationReadAll)
  const markDirty = useNotificationsStore((s) => s.markDirty)
  const [scope, setScope] = useState<Scope>('all')
  const [filter, setFilter] = useState<Filter>('unread')
  const [actingId, setActingId] = useState<number | null>(null)

  const scopeOptions = useMemo(() => {
    if (actingEntities.length === 0) return [me]
    return actingEntities
  }, [actingEntities, me])
  const unreadCount = useMemo(() => notifications.filter((item) => item.status === 'unread').length, [notifications])

  const visibleNotifications = useMemo(() => {
    const targetIds = scope === 'all'
      ? new Set(scopeOptions.map((entity) => entity.id))
      : new Set([Number(scope)])
    return notifications.filter((notification) => {
      if (!targetIds.has(notificationRecipientEntityId(notification))) return false
      if (filter === 'unread' && notification.status !== 'unread') return false
      return true
    })
  }, [filter, notifications, scope, scopeOptions])

  const markRead = useCallback(async (notification: NotificationRecord) => {
    const recipientEntityId = notificationRecipientEntityId(notification)
    setActingId(notification.id)
    const res = await api.markNotificationRead(token, notification.id, recipientEntityId === me.id ? undefined : recipientEntityId)
    if (res.ok && res.data) {
      applyNotificationRead(res.data)
    }
    setActingId(null)
  }, [applyNotificationRead, me.id, token])

  const markAllRead = useCallback(async () => {
    const targetIds = scope === 'all'
      ? Array.from(new Set(scopeOptions.map((entity) => entity.id)))
      : [Number(scope)]
    setActingId(-1)
    await Promise.all(targetIds.map((entityId) => api.markAllNotificationsRead(token, entityId === me.id ? undefined : entityId)))
    targetIds.forEach((entityId) => applyNotificationReadAll(entityId))
    setActingId(null)
  }, [applyNotificationReadAll, me.id, scope, scopeOptions, token])

  const handleFriendAction = useCallback(async (notification: NotificationRecord, action: 'accept' | 'reject') => {
    const requestId = notificationRequestId(notification)
    if (!requestId) return
    const recipientEntityId = notificationRecipientEntityId(notification)
    setActingId(notification.id)
    if (action === 'accept') {
      await api.acceptFriendRequest(token, requestId, recipientEntityId === me.id ? undefined : recipientEntityId)
    } else {
      await api.rejectFriendRequest(token, requestId, recipientEntityId === me.id ? undefined : recipientEntityId)
    }
    const readRes = await api.markNotificationRead(token, notification.id, recipientEntityId === me.id ? undefined : recipientEntityId)
    if (readRes.ok && readRes.data) {
      applyNotificationRead(readRes.data)
    } else {
      applyNotificationReadAll(recipientEntityId)
    }
    setActingId(null)
    markDirty()
  }, [applyNotificationRead, applyNotificationReadAll, markDirty, me.id, token])

  return (
    <div className="h-full min-h-0 flex flex-col bg-[var(--color-bg-primary)]">
      <div className="px-6 py-6 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{t('inbox.title')}</h1>
              {unreadCount > 0 && (
                <span className="inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-[var(--color-accent)]/12 px-2 text-xs font-semibold text-[var(--color-accent)]">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{t('inbox.subtitle')}</p>
          </div>
          {unreadCount > 0 && (
            <div className="flex w-full lg:w-auto">
              <button
                onClick={() => void markAllRead()}
                disabled={actingId === -1}
                className="h-11 w-full lg:w-auto px-4 rounded-2xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {actingId === -1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                {t('inbox.markAllRead')}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {t('inbox.scopeAll')}
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="h-11 w-full rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none"
            >
              <option value="all">{t('inbox.scopeAll')}</option>
              {scopeOptions.map((entity) => (
                <option key={entity.id} value={String(entity.id)}>
                  {entity.id === me.id ? t('friends.actAsSelf', { name: entityDisplayName(entity) }) : t('friends.actAsBot', { name: entityDisplayName(entity) })}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {t('inbox.filterAll')}
            </label>
            <div className="inline-flex w-full rounded-2xl bg-[var(--color-bg-secondary)] p-1 border border-[var(--color-border)]">
              {(['unread', 'all'] as Filter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={cn(
                    'h-9 flex-1 rounded-xl px-4 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap',
                    filter === item ? 'bg-[var(--color-accent)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                  )}
                >
                  {item === 'unread' ? t('inbox.filterUnread') : t('inbox.filterAll')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {visibleNotifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bell className="w-9 h-9 text-[var(--color-text-muted)] mb-3" />
            <div className="text-sm font-medium text-[var(--color-text-primary)]">{t('inbox.emptyTitle')}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{t('inbox.emptyDesc')}</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleNotifications.map((notification) => {
              const isUnread = notification.status === 'unread'
              const isPendingRequest = notification.kind === 'friend.request.received'
              const conversationPath = notificationConversationPath(notification)
              const actor = notification.actor_entity
              const recipient = notification.recipient_entity
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'rounded-3xl border px-4 py-4 bg-[var(--color-bg-secondary)] transition-colors',
                    isUnread ? 'border-[var(--color-accent)]/35' : 'border-[var(--color-border)]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <EntityAvatar entity={actor || recipient} size="sm" showStatus />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{notificationLabel(t, notification)}</span>
                        {isUnread && <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />}
                        {recipient && scope === 'all' && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                            {t('inbox.forEntity', { name: entityDisplayName(recipient) })}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{notification.body || notificationLabel(t, notification)}</p>
                      <p className="mt-2 text-xs text-[var(--color-text-muted)]">{new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isPendingRequest && (
                      <>
                        <button
                          onClick={() => void handleFriendAction(notification, 'accept')}
                          disabled={actingId === notification.id}
                          className="h-9 px-3 rounded-xl bg-[var(--color-success)] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {actingId === notification.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          {t('friends.accept')}
                        </button>
                        <button
                          onClick={() => void handleFriendAction(notification, 'reject')}
                          disabled={actingId === notification.id}
                          className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          {t('friends.reject')}
                        </button>
                      </>
                    )}

                    {!isPendingRequest && isUnread && (
                      <button
                        onClick={() => void markRead(notification)}
                        disabled={actingId === notification.id}
                        className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {actingId === notification.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {t('inbox.markRead')}
                      </button>
                    )}

                    {notification.kind === 'friend.request.accepted' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
                        <MessageCircleMore className="w-3.5 h-3.5" />
                        {t('inbox.friendsNowVisible')}
                      </span>
                    )}

                    {conversationPath && (
                      <button
                        onClick={() => navigate(conversationPath)}
                        className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <MessageCircleMore className="w-3.5 h-3.5" />
                        {t('inbox.openConversation')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
