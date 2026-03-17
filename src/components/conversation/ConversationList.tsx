import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, MessageSquare, Archive, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import type { Conversation } from '@/lib/types'

interface Props {
  conversations: Conversation[]
  activeId: number | null
  myEntityId: number
  onSelect: (id: number) => void
  onNewChat: () => void
  onUpdateConversation?: (id: number, title: string) => void
  onLeave?: (id: number) => void
  onArchive?: (id: number) => void
  onUnarchive?: (id: number) => void
  onPin?: (id: number) => void
  onUnpin?: (id: number) => void
  onRefresh?: () => Promise<void>
  archiveRefresh?: number
}

export function ConversationList({ conversations, activeId, myEntityId, onSelect, onNewChat, onUpdateConversation, onLeave, onArchive, onUnarchive, onPin, onUnpin, onRefresh, archiveRefresh }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [search, setSearch] = useState('')
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [archived, setArchived] = useState<Conversation[]>([])

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef(0)
  const isPullingRef = useRef(false)
  const PULL_THRESHOLD = 70

  const loadArchived = useCallback(async () => {
    try {
      const res = await api.listConversations(token, true)
      if (res.ok && res.data) setArchived(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      void error
      setArchived([])
    }
  }, [token])

  useEffect(() => {
    if (archivedOpen) loadArchived()
  }, [archivedOpen, loadArchived, archiveRefresh])

  // Sort conversations: pinned first, then by last message time (newest first)
  const sorted = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const pinnedA = a.participants?.find((p) => p.entity_id === myEntityId)?.pinned_at
      const pinnedB = b.participants?.find((p) => p.entity_id === myEntityId)?.pinned_at
      if (pinnedA && !pinnedB) return -1
      if (!pinnedA && pinnedB) return 1
      const timeA = a.last_message?.created_at || a.updated_at || a.created_at
      const timeB = b.last_message?.created_at || b.updated_at || b.created_at
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })
  }, [conversations, myEntityId])

  const filtered = search
    ? sorted.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.participants?.some((p) =>
          p.entity?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.entity?.name?.toLowerCase().includes(search.toLowerCase())
        )
      )
    : sorted

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      touchStartYRef.current = e.touches[0].clientY
      isPullingRef.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || refreshing) return
    const delta = e.touches[0].clientY - touchStartYRef.current
    if (delta > 0 && listRef.current && listRef.current.scrollTop === 0) {
      // Dampen the pull distance
      setPullDistance(Math.min(delta * 0.5, 100))
    } else {
      setPullDistance(0)
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    isPullingRef.current = false
    if (pullDistance >= PULL_THRESHOLD && onRefresh && !refreshing) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, onRefresh, refreshing])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('conversation.messages')}</h2>
        <button
          onClick={onNewChat}
          className="w-9 h-9 rounded-xl bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 flex items-center justify-center transition-colors cursor-pointer min-w-[36px]"
        >
          <Plus className="w-4.5 h-4.5 text-[var(--color-accent)]" />
        </button>
      </div>

      {/* Search — polished rounded style */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('conversation.search')}
            className="w-full h-9 pl-10 pr-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--color-text-muted)]/20 flex items-center justify-center cursor-pointer hover:bg-[var(--color-text-muted)]/30 transition-colors"
            >
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">&times;</span>
            </button>
          )}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center flex-shrink-0 overflow-hidden transition-[height] duration-200"
          style={{ height: refreshing ? 40 : pullDistance > 0 ? Math.min(pullDistance, 50) : 0 }}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin" />
          ) : pullDistance >= PULL_THRESHOLD ? (
            <span className="text-[10px] text-[var(--color-accent)] font-medium">{t('conversation.refreshing')}</span>
          ) : (
            <span className="text-[10px] text-[var(--color-text-muted)]">{t('conversation.pullToRefresh')}</span>
          )}
        </div>
      )}

      {/* List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {filtered.length === 0 ? (
          search ? (
            <EmptyState
              icon={<Search className="w-7 h-7" />}
              title={t('conversation.noMatches')}
              className="py-8"
            />
          ) : (
            <EmptyState
              icon={<MessageSquare className="w-7 h-7" />}
              title={t('conversation.noConversations')}
              description={t('conversation.noConversationsDesc')}
              action={
                <button
                  onClick={onNewChat}
                  className="px-4 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium cursor-pointer transition-colors"
                >
                  {t('conversation.newChat')}
                </button>
              }
            />
          )
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeId}
              myEntityId={myEntityId}
              onClick={() => onSelect(conv.id)}
              onUpdate={onUpdateConversation}
              onLeave={onLeave}
              onArchive={onArchive}
              onPin={onPin}
              onUnpin={onUnpin}
            />
          ))
        )}
      </div>

      {/* Archive folder */}
      {!search && (
        <div className="flex-shrink-0 border-t border-[var(--color-border)] px-2 py-1">
          <button
            onClick={() => setArchivedOpen(!archivedOpen)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] cursor-pointer transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{t('conversation.archived')}</span>
            {archivedOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
          {archivedOpen && (
            <div className="space-y-0.5 opacity-60 max-h-48 overflow-y-auto">
              {archived.length === 0 ? (
                <p className="text-[10px] text-[var(--color-text-muted)] text-center py-3">{t('conversation.noArchivedConversations')}</p>
              ) : (
                archived.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeId}
                    myEntityId={myEntityId}
                    onClick={() => onSelect(conv.id)}
                    onUnarchive={onUnarchive}
                    isArchived
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
