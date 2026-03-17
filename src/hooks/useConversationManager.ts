import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import { cacheConversations, getCachedConversations } from '@/lib/cache'
import { listOutboxMessages, deleteOutboxMessage, updateOutboxMessage } from '@/lib/cache'
import type { Conversation } from '@/lib/types'

export function useConversationManager() {
  const { t } = useTranslation()
  const { token, entity } = useAuthStore()
  const { conversations, activeId, setConversations, setActive, updateConversation, removeConversation } = useConversationsStore()
  const { setOnline } = usePresenceStore()

  const flushingOutboxRef = useRef(false)
  const [convsLoading, setConvsLoading] = useState(true)
  const [leaveConfirmId, setLeaveConfirmId] = useState<number | null>(null)
  const [archiveRefresh, setArchiveRefresh] = useState(0)
  const [archivedConv, setArchivedConv] = useState<Conversation | null>(null)
  const [outboxCount, setOutboxCount] = useState(0)
  const [outboxFailedCount, setOutboxFailedCount] = useState(0)
  const [outboxLastSyncAt, setOutboxLastSyncAt] = useState<string | null>(null)
  const [outboxLastError, setOutboxLastError] = useState<string | null>(null)

  // ─── Load cached conversations on start ───
  useEffect(() => {
    if (!token) return
    getCachedConversations().then((cached) => {
      if (cached.length > 0) setConversations(cached)
    })
  }, [token])

  // ─── Load conversations ───
  const loadConversations = useCallback(async () => {
    if (!token) return
    setConvsLoading(true)
    const res = await api.listConversations(token)
    setConvsLoading(false)
    if (res.ok && res.data) {
      const convs = Array.isArray(res.data) ? res.data : []
      setConversations(convs)
      cacheConversations(convs)

      const entityIds = new Set<number>()
      for (const conv of convs) {
        for (const p of conv.participants || []) {
          if (p.entity_id !== entity?.id) entityIds.add(p.entity_id)
        }
      }
      if (entityIds.size > 0) {
        const presRes = await api.batchPresence(token, Array.from(entityIds))
        if (presRes.ok && presRes.data?.presence) {
          for (const [idStr, isOnline] of Object.entries(presRes.data.presence)) {
            setOnline(Number(idStr), isOnline as boolean)
          }
        }
      }
    }
  }, [token, entity?.id])

  useEffect(() => {
    if (token) loadConversations()
  }, [token])

  // ─── Flush offline outbox ───
  useEffect(() => {
    if (!token || !entity || entity.entity_type !== 'user') return

    const refreshOutboxCount = async () => {
      const queued = await listOutboxMessages()
      setOutboxCount(queued.length)
      setOutboxFailedCount(queued.filter((m) => m.sync_state === 'failed').length)
      const latestErr = queued
        .filter((m) => !!m.last_error)
        .sort((a, b) => (b.last_attempt_at || '').localeCompare(a.last_attempt_at || ''))[0]
      setOutboxLastError(latestErr?.last_error || null)
    }

    const flushOutbox = async () => {
      await refreshOutboxCount()
      if (!navigator.onLine) return
      if (flushingOutboxRef.current) return
      flushingOutboxRef.current = true
      const queued = await listOutboxMessages()
      try {
        if (queued.length === 0) return
        const optimistic = useMessagesStore.getState()
        for (const item of queued) {
          if (!item.id) continue
          optimistic.setOptimisticState(item.temp_id, 'sending')
          await updateOutboxMessage(item.id, {
            sync_state: 'sending',
            attempts: (item.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
            last_error: '',
          })
          const res = await api.sendMessage(token, {
            conversation_id: item.conversation_id,
            content_type: item.content_type || 'text',
            layers: {
              summary: item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text,
              data: { body: item.text },
            },
            mentions: item.mentions,
            reply_to: item.reply_to,
          })
          if (res.ok && res.data) {
            optimistic.replaceOptimisticMessage(item.temp_id, res.data)
            await deleteOutboxMessage(item.id)
            setOutboxLastSyncAt(new Date().toISOString())
            await refreshOutboxCount()
          } else {
            optimistic.setOptimisticState(item.temp_id, navigator.onLine ? 'failed' : 'queued')
            const detail = typeof res.error === 'string'
              ? res.error
              : (res.error?.message || t('connection.syncFailed'))
            await updateOutboxMessage(item.id, {
              sync_state: navigator.onLine ? 'failed' : 'queued',
              last_error: detail,
              last_attempt_at: new Date().toISOString(),
            })
            setOutboxLastError(detail)
            break
          }
        }
      } finally {
        flushingOutboxRef.current = false
      }
    }

    void flushOutbox()
    const onOnline = () => { void flushOutbox() }
    const timer = setInterval(() => { void flushOutbox() }, 15000)
    const counterTimer = setInterval(() => { void refreshOutboxCount() }, 5000)
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(timer)
      clearInterval(counterTimer)
      window.removeEventListener('online', onOnline)
    }
  }, [token, entity, t])

  const retryOutboxNow = useCallback(async () => {
    if (!token) return
    if (!navigator.onLine) return
    const queued = await listOutboxMessages()
    if (queued.length === 0) return
    const optimistic = useMessagesStore.getState()
    for (const item of queued) {
      if (!item.id) continue
      optimistic.setOptimisticState(item.temp_id, 'sending')
      await updateOutboxMessage(item.id, {
        sync_state: 'sending',
        attempts: (item.attempts || 0) + 1,
        last_attempt_at: new Date().toISOString(),
        last_error: '',
      })
      const res = await api.sendMessage(token, {
        conversation_id: item.conversation_id,
        content_type: item.content_type || 'text',
        layers: {
          summary: item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text,
          data: { body: item.text },
        },
        mentions: item.mentions,
        reply_to: item.reply_to,
      })
      if (res.ok && res.data) {
        optimistic.replaceOptimisticMessage(item.temp_id, res.data)
        await deleteOutboxMessage(item.id)
        setOutboxLastSyncAt(new Date().toISOString())
      } else {
        const detail = typeof res.error === 'string'
          ? res.error
          : (res.error?.message || t('connection.syncFailed'))
        optimistic.setOptimisticState(item.temp_id, 'failed')
        await updateOutboxMessage(item.id, {
          sync_state: 'failed',
          last_error: detail,
          last_attempt_at: new Date().toISOString(),
        })
        setOutboxLastError(detail)
        break
      }
    }
    const refreshed = await listOutboxMessages()
    setOutboxCount(refreshed.length)
    setOutboxFailedCount(refreshed.filter((m) => m.sync_state === 'failed').length)
  }, [token, t])

  // ─── Leave / Archive / Pin conversation ───
  const handleLeaveConversation = useCallback((convId: number) => {
    setLeaveConfirmId(convId)
  }, [])

  const confirmLeave = useCallback(async () => {
    if (!token || !leaveConfirmId) return
    const res = await api.leaveConversation(token, leaveConfirmId)
    if (res.ok) {
      removeConversation(leaveConfirmId)
    }
    setLeaveConfirmId(null)
  }, [token, leaveConfirmId])

  const handleArchiveConversation = useCallback(async (convId: number) => {
    if (!token) return
    const res = await api.archiveConversation(token, convId)
    if (res.ok) {
      removeConversation(convId)
      setArchiveRefresh((n) => n + 1)
    }
  }, [token])

  const handleUnarchiveConversation = useCallback(async (convId: number) => {
    if (!token) return
    const res = await api.unarchiveConversation(token, convId)
    if (res.ok) {
      setArchiveRefresh((n) => n + 1)
      loadConversations()
    }
  }, [token, loadConversations])

  const handlePinConversation = useCallback(async (convId: number) => {
    if (!token || !entity) return
    const res = await api.pinConversation(token, convId)
    if (res.ok) {
      const conv = conversations.find((c) => c.id === convId)
      if (conv) {
        const updated = { ...conv, participants: conv.participants?.map((p) =>
          p.entity_id === entity.id ? { ...p, pinned_at: new Date().toISOString() } : p
        )}
        updateConversation(convId, updated)
      }
    }
  }, [token, entity, conversations])

  const handleUnpinConversation = useCallback(async (convId: number) => {
    if (!token || !entity) return
    const res = await api.unpinConversation(token, convId)
    if (res.ok) {
      const conv = conversations.find((c) => c.id === convId)
      if (conv) {
        const updated = { ...conv, participants: conv.participants?.map((p) =>
          p.entity_id === entity.id ? { ...p, pinned_at: undefined } : p
        )}
        updateConversation(convId, updated)
      }
    }
  }, [token, entity, conversations])

  // ─── Archived conversation view ───
  useEffect(() => {
    if (!activeId || !token) { setArchivedConv(null); return }
    const inMain = conversations.find((c) => c.id === activeId)
    if (inMain) { setArchivedConv(null); return }
    if (archivedConv && archivedConv.id === activeId) return
    api.getConversation(token, activeId).then((res) => {
      if (res.ok && res.data) setArchivedConv(res.data)
      else setArchivedConv(null)
    })
  }, [activeId, conversations, token])

  const activeConv = conversations.find((c) => c.id === activeId) || archivedConv
  const isArchivedView = activeConv === archivedConv && archivedConv !== null

  return {
    conversations,
    activeId,
    activeConv,
    isArchivedView,
    convsLoading,
    leaveConfirmId,
    archiveRefresh,
    outboxCount,
    outboxFailedCount,
    outboxLastSyncAt,
    outboxLastError,
    loadConversations,
    retryOutboxNow,
    handleLeaveConversation,
    confirmLeave,
    setLeaveConfirmId,
    handleArchiveConversation,
    handleUnarchiveConversation,
    handlePinConversation,
    handleUnpinConversation,
  }
}
