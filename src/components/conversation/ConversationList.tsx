import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, MessageSquare, Archive, ChevronDown, ChevronRight } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
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
  archiveRefresh?: number
}

export function ConversationList({ conversations, activeId, myEntityId, onSelect, onNewChat, onUpdateConversation, onLeave, onArchive, onUnarchive, onPin, onUnpin, archiveRefresh }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [search, setSearch] = useState('')
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [archived, setArchived] = useState<Conversation[]>([])

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
      // Pinned conversations come first
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('conversation.messages')}</h2>
        <button
          onClick={onNewChat}
          className="w-8 h-8 rounded-lg bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[var(--color-accent)]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('conversation.search')}
            className="w-full h-8 pl-8.5 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">{search ? t('conversation.noMatches') : t('conversation.noConversations')}</p>
          </div>
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

      {/* Archive folder — pinned to bottom */}
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
