import { useEffect, useState, useCallback, useMemo } from 'react'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { StreamingOverlay } from './StreamingOverlay'
import { GroupMembersPanel } from '@/components/conversation/GroupMembersPanel'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { useAuthStore } from '@/store/auth'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import type { Conversation, ActiveStream, Message } from '@/lib/types'
import { entityDisplayName, cn } from '@/lib/utils'
import { Search, Users, ArrowLeft, Loader2, X } from 'lucide-react'

const EMPTY_MESSAGES: Message[] = []

interface Props {
  conversation: Conversation
  onBack?: () => void
  onCancelStream?: (streamId: string, conversationId: number) => void
}

export function ChatThread({ conversation, onBack, onCancelStream }: Props) {
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const messages = useMessagesStore((s) => s.byConv[conversation.id] ?? EMPTY_MESSAGES)
  const hasMore = useMessagesStore((s) => s.hasMore[conversation.id] ?? true)
  const streams = useMessagesStore((s) => s.streams)
  const setMessages = useMessagesStore((s) => s.setMessages)
  const prependMessages = useMessagesStore((s) => s.prependMessages)
  const addMessage = useMessagesStore((s) => s.addMessage)
  const revokeMessage = useMessagesStore((s) => s.revokeMessage)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const online = usePresenceStore((s) => s.online)

  // Determine other participant for direct chats
  const otherParticipant = conversation.participants?.find((p) => p.entity_id !== myEntity.id)?.entity
  const isGroup = conversation.conv_type === 'group' || conversation.conv_type === 'channel'
  const isOtherOnline = otherParticipant ? online.has(otherParticipant.id) : false

  // Active streams for this conversation
  const convStreams = useMemo<ActiveStream[]>(
    () => Object.values(streams).filter((s) => s?.conversation_id === conversation.id),
    [streams, conversation.id],
  )

  // Load messages
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const res = await api.listMessages(token, conversation.id)
      if (!cancelled && res.ok && res.data) {
        setMessages(conversation.id, res.data.messages.reverse(), res.data.has_more)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [conversation.id, token])

  // Mark as read when viewing messages
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.sender_id !== myEntity.id) {
      api.markAsRead(token, conversation.id, lastMsg.id)
    }
    updateConversation(conversation.id, { unread_count: 0 })
  }, [messages.length, conversation.id])

  // Load more
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const oldest = messages[0]
    if (!oldest) return
    setLoading(true)
    const res = await api.listMessages(token, conversation.id, oldest.id)
    if (res.ok && res.data) {
      prependMessages(conversation.id, res.data.messages.reverse(), res.data.has_more)
    }
    setLoading(false)
  }, [loading, hasMore, messages, token, conversation.id])

  // Debounced search
  useEffect(() => {
    if (!searching || !searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setSearchLoading(true)
    const timeout = setTimeout(async () => {
      const res = await api.searchMessages(token, conversation.id, searchQuery.trim())
      if (res.ok && res.data) {
        setSearchResults(res.data.messages)
      }
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, searching, token, conversation.id])

  // Send message
  const handleSend = useCallback(async (text: string, files?: File[], mentions?: number[]) => {
    let attachments: { type: string; url: string; filename: string; mime_type: string; size: number }[] = []

    // Upload files first
    if (files && files.length > 0) {
      for (const file of files) {
        const res = await api.uploadFile(token, file)
        if (res.ok && res.data) {
          attachments.push({
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url: res.data.url,
            filename: file.name,
            mime_type: file.type,
            size: file.size,
          })
        }
      }
    }

    const contentType = attachments.some((a) => a.type === 'image') ? 'image' : 'text'

    const res = await api.sendMessage(token, {
      conversation_id: conversation.id,
      content_type: contentType,
      layers: {
        summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
        data: { body: text },
      },
      attachments: attachments.length > 0 ? attachments : undefined,
      mentions,
    })

    if (res.ok && res.data) {
      addMessage(res.data)
    }
  }, [token, conversation.id])

  // Revoke message
  const handleRevoke = useCallback(async (msgId: number) => {
    const res = await api.revokeMessage(token, msgId)
    if (res.ok) {
      revokeMessage(conversation.id, msgId)
    }
  }, [token, conversation.id])

  // Interaction reply
  const handleInteractionReply = useCallback(async (msgId: number, choice: string, label: string) => {
    const res = await api.sendMessage(token, {
      conversation_id: conversation.id,
      content_type: 'text',
      layers: {
        summary: label,
        data: { interaction_reply: { reply_to: msgId, choice } },
      },
      reply_to: msgId,
    })
    if (res.ok && res.data) addMessage(res.data)
  }, [token, conversation.id])

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {onBack && (
          <button onClick={onBack} className="lg:hidden w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {isGroup ? (
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center">
            <Users className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
        ) : (
          <EntityAvatar entity={otherParticipant} size="sm" showStatus />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {conversation.title || entityDisplayName(otherParticipant)}
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {isGroup
              ? (
                  <button
                    onClick={() => setShowMembers(true)}
                    className="hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                  >
                    {conversation.participants?.length || 0} participants
                  </button>
                )
              : isOtherOnline ? (
                  <span className="text-[var(--color-success)]">Online</span>
                ) : 'Offline'
            }
          </p>
        </div>

        <button
          onClick={() => {
            if (searching) {
              setSearching(false)
              setSearchQuery('')
              setSearchResults(null)
            } else {
              setSearching(true)
            }
          }}
          className={cn(
            'w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors',
            searching ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          )}
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      {searching && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              autoFocus
              className="flex-1 h-8 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
            {searchLoading && <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin flex-shrink-0" />}
            {searchQuery && !searchLoading && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null) }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--color-bg-hover)] cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
          {searchResults !== null && !searchLoading && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
              {searchResults.length === 0 ? 'No results found' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[var(--color-text-muted)]" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <MessageList
          messages={searchResults ?? messages}
          myEntityId={myEntity.id}
          loading={searchResults !== null ? searchLoading : loading}
          hasMore={searchResults !== null ? false : hasMore}
          onLoadMore={searchResults !== null ? undefined : handleLoadMore}
          onInteractionReply={handleInteractionReply}
          onRevoke={handleRevoke}
        />
      )}

      {/* Streaming overlay */}
      <StreamingOverlay streams={convStreams} onCancel={onCancelStream} />

      {/* Group members panel */}
      {showMembers && isGroup && (
        <GroupMembersPanel
          conversation={conversation}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Composer */}
      <MessageComposer
        onSend={handleSend}
        placeholder={`Message ${conversation.title || entityDisplayName(otherParticipant)}...`}
        participants={conversation.participants}
      />
    </div>
  )
}
