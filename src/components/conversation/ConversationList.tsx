import { useState } from 'react'
import { Search, Plus, MessageSquare } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import type { Conversation } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  conversations: Conversation[]
  activeId: number | null
  myEntityId: number
  onSelect: (id: number) => void
  onNewChat: () => void
  onUpdateConversation?: (id: number, title: string) => void
}

export function ConversationList({ conversations, activeId, myEntityId, onSelect, onNewChat, onUpdateConversation }: Props) {
  const [search, setSearch] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['default']))

  const filtered = search
    ? conversations.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.participants?.some((p) =>
          p.entity?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.entity?.name?.toLowerCase().includes(search.toLowerCase())
        )
      )
    : conversations

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }

  // Group conversations by folder (simplified: all in "default" for now)
  const folders = [{ id: 'default', name: 'All Conversations', conversations: filtered }]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Messages</h2>
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
            placeholder="Search conversations..."
            className="w-full h-8 pl-8.5 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">{search ? 'No matches' : 'No conversations yet'}</p>
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
            />
          ))
        )}
      </div>
    </div>
  )
}
