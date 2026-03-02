import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, entityDisplayName, formatTime, formatFileSize } from '@/lib/utils'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { InteractionCard } from './InteractionCard'
import type { Message } from '@/lib/types'
import {
  FileText, Download, Image as ImageIcon, Play, Pause,
  Brain, ChevronDown, ChevronUp, Reply, CornerUpLeft, Ban, Trash2,
} from 'lucide-react'

interface Props {
  message: Message
  isSelf: boolean
  onInteractionReply?: (msgId: number, choice: string, label: string) => void
  onRevoke?: (msgId: number) => void
  showSender?: boolean
}

export function MessageBubble({ message, isSelf, onInteractionReply, onRevoke, showSender = true }: Props) {
  const [showThinking, setShowThinking] = useState(false)
  const layers = message.layers || {}
  const isRevoked = !!message.revoked_at
  const isBot = message.sender_type === 'bot' || message.sender_type === 'service'

  // Can revoke within 2 minutes
  const canRevoke = isSelf && !isRevoked && onRevoke &&
    (Date.now() - new Date(message.created_at).getTime()) < 2 * 60 * 1000

  // Revoked message
  if (isRevoked) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-[var(--color-text-muted)] italic flex items-center gap-1">
          <Ban className="w-3 h-3" />
          {entityDisplayName(message.sender)} revoked a message
        </span>
      </div>
    )
  }

  // System message
  if (message.content_type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {layers.summary}
        </span>
      </div>
    )
  }

  const renderContent = () => {
    const body = (layers.data?.body as string) || layers.summary || ''

    switch (message.content_type) {
      case 'markdown':
        return (
          <div className="md text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>
        )

      case 'code':
        return (
          <div className="md">
            <pre className="!m-0">
              <code>{body}</code>
            </pre>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-1.5">
            {body && <p className="text-sm">{body}</p>}
            {message.attachments?.map((att, i) => (
              <img
                key={i}
                src={att.url}
                alt={att.filename || 'image'}
                className="max-w-[280px] max-h-[280px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            ))}
          </div>
        )

      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <button className="w-8 h-8 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[var(--color-accent)]/20 transition-colors">
              <Play className="w-3.5 h-3.5 text-[var(--color-accent)] ml-0.5" />
            </button>
            <div className="flex-1 h-6 flex items-center gap-px">
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-[var(--color-accent)]/40"
                  style={{ height: `${12 + Math.sin(i * 0.7) * 10 + Math.random() * 6}px` }}
                />
              ))}
            </div>
            {message.attachments?.[0]?.duration && (
              <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
                {Math.floor(message.attachments[0].duration / 60)}:{String(message.attachments[0].duration % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        )

      case 'file':
        return (
          <div className="space-y-1.5">
            {body && <p className="text-sm">{body}</p>}
            {message.attachments?.map((att, i) => (
              <a
                key={i}
                href={att.url}
                download={att.filename}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-bg-primary)]/50 border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-dim)] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                    {att.filename || 'file'}
                  </p>
                  {att.size && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {formatFileSize(att.size)}
                    </p>
                  )}
                </div>
                <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        )

      default: // text
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 max-w-[85%] group',
        isSelf ? 'ml-auto flex-row-reverse' : '',
      )}
      style={{ animation: 'slideUp 0.2s ease-out' }}
    >
      {/* Avatar */}
      {showSender && !isSelf && (
        <EntityAvatar entity={message.sender} size="sm" className="mt-0.5" />
      )}

      <div className={cn('space-y-0.5', isSelf ? 'items-end' : 'items-start', 'flex flex-col')}>
        {/* Sender name + time */}
        {showSender && (
          <div className={cn('flex items-center gap-2 px-1', isSelf ? 'flex-row-reverse' : '')}>
            {!isSelf && (
              <span className={cn(
                'text-[11px] font-medium',
                isBot ? 'text-[var(--color-bot)]' : 'text-[var(--color-text-secondary)]',
              )}>
                {entityDisplayName(message.sender)}
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Reply indicator */}
        {message.reply_to && (
          <div className={cn('flex items-center gap-1 px-1 text-[10px] text-[var(--color-text-muted)]', isSelf ? 'flex-row-reverse' : '')}>
            <CornerUpLeft className="w-3 h-3" />
            <span>Replying to message #{message.reply_to}</span>
          </div>
        )}

        {/* Bubble + revoke */}
        <div className={cn('flex items-center gap-1', isSelf ? 'flex-row-reverse' : '')}>
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2.5 max-w-full',
              isSelf
                ? 'bg-[var(--color-bubble-self)] rounded-tr-md'
                : 'bg-[var(--color-bubble-other)] border border-[var(--color-border-subtle)] rounded-tl-md',
            )}
          >
            {renderContent()}

            {/* Interaction card */}
            {layers.interaction && onInteractionReply && (
              <InteractionCard
                interaction={layers.interaction}
                messageId={message.id}
                onReply={(choice, label) => onInteractionReply(message.id, choice, label)}
              />
            )}
          </div>

          {/* Revoke button */}
          {canRevoke && (
            <button
              onClick={() => onRevoke!(message.id)}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-[var(--color-error)]/15 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
              title="撤回消息"
            >
              <Trash2 className="w-3 h-3 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
            </button>
          )}
        </div>

        {/* Thinking toggle */}
        {layers.thinking && (
          <div className="px-1">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            >
              <Brain className="w-3 h-3" />
              <span>Thinking</span>
              {showThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showThinking && (
              <div className="mt-1 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded-lg text-[11px] text-[var(--color-text-muted)] leading-relaxed italic max-h-32 overflow-y-auto max-w-full">
                {layers.thinking}
              </div>
            )}
          </div>
        )}

        {/* Mentions */}
        {message.mentions && message.mentions.length > 0 && (
          <div className="px-1 flex items-center gap-1 text-[10px] text-[var(--color-accent)] opacity-60">
            @{message.mentions.length} mentioned
          </div>
        )}
      </div>
    </div>
  )
}
