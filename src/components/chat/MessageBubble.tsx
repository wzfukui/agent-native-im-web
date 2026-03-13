import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, entityDisplayName, formatTime, formatFileSize } from '@/lib/utils'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { InteractionCard } from './InteractionCard'
import { ArtifactRenderer } from './ArtifactRenderer'
import { HandoverCard } from './HandoverCard'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import type { Message } from '@/lib/types'
import { ReactionBar } from './ReactionBar'
import {
  FileText, Download, Play, Pause,
  Brain, ChevronDown, ChevronUp, CornerUpLeft, Ban, Trash2, Reply, SmilePlus, CloudOff, AlertTriangle,
} from 'lucide-react'

/** Max collapsed height in px (~10 lines of text) */
const COLLAPSE_HEIGHT = 240

function AudioPlayer({ url, duration: totalDuration }: { url?: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio || !url) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const dur = totalDuration || 0
  const barHeights = Array.from({ length: 24 }, (_, i) =>
    12 + Math.sin(i * 0.7) * 10 + ((i * 7 + 3) % 6)
  )

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0) }}
          onTimeUpdate={() => {
            const a = audioRef.current
            if (a && a.duration) setProgress(a.currentTime / a.duration)
          }}
        />
      )}
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-[var(--color-accent-dim)] flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[var(--color-accent)]/20 transition-colors"
      >
        {playing
          ? <Pause className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          : <Play className="w-3.5 h-3.5 text-[var(--color-accent)] ml-0.5" />
        }
      </button>
      <div className="flex-1 h-6 flex items-center gap-px">
        {barHeights.map((h, i) => {
          const filled = progress > i / barHeights.length
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-full transition-colors',
                filled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-accent)]/30',
              )}
              style={{ height: `${h}px` }}
            />
          )
        })}
      </div>
      {dur > 0 && (
        <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
          {Math.floor(dur / 60)}:{String(dur % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}

interface Props {
  message: Message
  isSelf: boolean
  myEntityId?: number
  replyMessage?: Message
  onInteractionReply?: (msgId: number, choice: string, label: string) => void
  onRevoke?: (msgId: number) => void
  onReply?: (msg: Message) => void
  onReact?: (msgId: number, emoji: string) => void
  onRetryOutbox?: (tempId: string) => void
  showSender?: boolean
}

export function MessageBubble({ message, isSelf, myEntityId, replyMessage, onInteractionReply, onRevoke, onReply, onReact, onRetryOutbox, showSender = true }: Props) {
  const { t } = useTranslation()
  const [showThinking, setShowThinking] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt?: string } | null>(null)
  const [showQuickReact, setShowQuickReact] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [isOverflow, setIsOverflow] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const layers = message.layers || {}

  // Measure content height to decide if collapse is needed
  const measureOverflow = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    setIsOverflow(el.scrollHeight > COLLAPSE_HEIGHT + 40)
  }, [])

  useEffect(() => {
    measureOverflow()
  }, [message.layers?.summary, measureOverflow])
  const isRevoked = !!message.revoked_at
  const isBot = message.sender_type === 'bot' || message.sender_type === 'service'
  const isMentioned = myEntityId != null && message.mentions?.includes(myEntityId)

  // Can revoke within 2 minutes
  const canRevoke = isSelf && !isRevoked && onRevoke &&
    (Date.now() - new Date(message.created_at).getTime()) < 2 * 60 * 1000

  const canReply = !isRevoked && onReply
  const canReact = !isRevoked && onReact
  const canRetryOutbox = isSelf && !!message.temp_id && message.client_state !== 'sending' && !!onRetryOutbox

  // Revoked message
  if (isRevoked) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-[var(--color-text-muted)] italic flex items-center gap-1">
          <Ban className="w-3 h-3" />
          {t('message.revoked', { name: entityDisplayName(message.sender) })}
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

    // Bot/service messages default to markdown rendering
    const effectiveType = (message.content_type === 'text' && isBot) ? 'markdown' : message.content_type

    switch (effectiveType) {
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
            <div className="flex flex-wrap gap-1.5">
              {message.attachments?.map((att, i) => {
                if (!att.url) return null
                return (
                  <div
                    key={i}
                    className="relative group cursor-pointer"
                    onClick={() => setLightboxImage({ url: att.url!, alt: att.filename || 'image' })}
                  >
                    <img
                      src={att.url}
                      alt={att.filename || 'image'}
                      className="w-[150px] h-[150px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium">View</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'audio':
        return <AudioPlayer url={message.attachments?.[0]?.url} duration={message.attachments?.[0]?.duration} />

      case 'artifact': {
        const artifactType = (layers.data?.artifact_type as string) || 'html'
        const source = (layers.data?.source as string) || body
        const title = (layers.data?.title as string) || ''
        const language = (layers.data?.language as string) || ''
        const height = (layers.data?.height as number) || 300
        return (
          <div className="min-w-[280px]">
            {layers.summary && (
              <p className="text-sm leading-relaxed px-3.5 pt-2.5 pb-1.5">{layers.summary}</p>
            )}
            <ArtifactRenderer
              artifactType={artifactType}
              source={source}
              title={title}
              language={language}
              height={height}
            />
          </div>
        )
      }

      case 'task_handover':
        return <HandoverCard message={message} />

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
        return (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1.5 mt-1.5">
                {message.attachments.some((att) => att.type === 'image') && (
                  <div className="flex flex-wrap gap-1.5">
                    {message.attachments.filter((att) => att.type === 'image').map((att, i) => {
                      if (!att.url) return null
                      return (
                        <div
                          key={i}
                          className="relative group cursor-pointer"
                          onClick={() => setLightboxImage({ url: att.url!, alt: att.filename || 'image' })}
                        >
                          <img
                            src={att.url}
                            alt={att.filename || 'image'}
                            className="w-[150px] h-[150px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium">View</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {message.attachments.filter((att) => att.type !== 'image').map((att, i) => (
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
            )}
          </>
        )
    }
  }

  return (
    <>
    <div
      className={cn(
        'flex gap-2.5 max-w-[85%] group transition-opacity duration-300',
        isSelf ? 'ml-auto flex-row-reverse' : '',
        isMentioned ? 'relative' : '',
        message.client_state === 'sending' ? 'opacity-60' : '',
      )}
      style={{ animation: 'slide-up 0.2s cubic-bezier(0.16,1,0.3,1)' }}
    >
      {/* Mention highlight bar */}
      {isMentioned && !isSelf && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-[var(--color-accent)]" />
      )}
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
            <span className="text-[10px] text-[var(--color-text-muted)] opacity-40 group-hover:opacity-100 transition-opacity">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        {/* Reply indicator */}
        {message.reply_to && (
          <div className={cn('flex items-center gap-1.5 px-1 text-[10px]', isSelf ? 'flex-row-reverse' : '')}>
            <CornerUpLeft className="w-3 h-3 text-[var(--color-text-muted)] flex-shrink-0" />
            {replyMessage ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] border-l-2 border-[var(--color-accent)]/40 max-w-[200px]">
                <span className="font-medium text-[var(--color-accent)] truncate">{entityDisplayName(replyMessage.sender)}</span>
                <span className="text-[var(--color-text-muted)] truncate">{(replyMessage.layers?.summary || '').slice(0, 50)}</span>
              </div>
            ) : (
              <span className="text-[var(--color-text-muted)]">{t('message.replyTo', { id: message.reply_to })}</span>
            )}
          </div>
        )}

        {/* Bubble + revoke */}
        <div className={cn('flex items-center gap-1', isSelf ? 'flex-row-reverse' : '')}>
          <div
            className={cn(
              'rounded-2xl max-w-full',
              (message.content_type === 'artifact' || message.content_type === 'task_handover') ? 'p-0 overflow-hidden' : 'px-3.5 py-2.5',
              isSelf
                ? 'bg-[var(--color-bubble-self)] rounded-tr-md'
                : 'bg-[var(--color-bubble-other)] border border-[var(--color-border-subtle)] rounded-tl-md',
            )}
          >
            {/* Collapsible content wrapper */}
            <div className="relative">
              <div
                ref={contentRef}
                className={cn(
                  'overflow-hidden transition-[max-height] duration-300',
                  isOverflow && collapsed ? '' : '',
                )}
                style={isOverflow && collapsed ? { maxHeight: `${COLLAPSE_HEIGHT}px` } : undefined}
              >
                {renderContent()}
              </div>
              {/* Gradient fade + expand button */}
              {isOverflow && collapsed && (
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="h-16 bg-gradient-to-t from-[var(--color-bubble-other)] to-transparent pointer-events-none"
                    style={isSelf ? { background: `linear-gradient(to top, var(--color-bubble-self), transparent)` } : undefined}
                  />
                  <div className={cn('flex justify-center pb-1 -mt-1', isSelf ? 'bg-[var(--color-bubble-self)]' : 'bg-[var(--color-bubble-other)]')}>
                    <button
                      onClick={() => setCollapsed(false)}
                      className="text-[11px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium cursor-pointer flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/15 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                      {t('message.expandMore')}
                    </button>
                  </div>
                </div>
              )}
              {isOverflow && !collapsed && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setCollapsed(true)}
                    className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] font-medium cursor-pointer flex items-center gap-1 px-3 py-1 rounded-full hover:bg-[var(--color-accent)]/10 transition-colors"
                  >
                    <ChevronUp className="w-3 h-3" />
                    {t('message.collapseContent')}
                  </button>
                </div>
              )}
            </div>

            {/* Interaction card */}
            {layers.interaction && onInteractionReply && (
              <InteractionCard
                interaction={layers.interaction}
                messageId={message.id}
                onReply={(choice, label) => onInteractionReply(message.id, choice, label)}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className={cn('opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all flex-shrink-0 relative', isSelf ? 'flex-row-reverse' : '')}>
            {canReply && (
              <button
                onClick={() => onReply!(message)}
                className="w-6 h-6 rounded-md hover:bg-[var(--color-accent)]/15 flex items-center justify-center cursor-pointer"
                title={t('chat.reply')}
              >
                <Reply className="w-3 h-3 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" />
              </button>
            )}
            {canReact && (
              <button
                onClick={() => setShowQuickReact(!showQuickReact)}
                className="w-6 h-6 rounded-md hover:bg-[var(--color-accent)]/15 flex items-center justify-center cursor-pointer"
                title={t('chat.addReaction')}
              >
                <SmilePlus className="w-3 h-3 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" />
              </button>
            )}
            {canRevoke && (
              <button
                onClick={() => onRevoke!(message.id)}
                className="w-6 h-6 rounded-md hover:bg-[var(--color-error)]/15 flex items-center justify-center cursor-pointer"
                title={t('message.revoke')}
              >
                <Trash2 className="w-3 h-3 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
              </button>
            )}
            {/* Quick emoji picker */}
            {showQuickReact && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQuickReact(false)} />
                <div className={cn(
                  'absolute z-20 bottom-full mb-1 flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-lg',
                  isSelf ? 'right-0' : 'left-0',
                )}>
                  {['👍', '❤️', '😂', '🎉', '🤔', '👀'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onReact!(message.id, emoji); setShowQuickReact(false) }}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors text-base cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reactions */}
        {onReact && myEntityId != null && (message.reactions?.length || 0) > 0 && (
          <div className="px-0.5">
            <ReactionBar
              reactions={message.reactions!}
              myEntityId={myEntityId}
              isSelf={isSelf}
              onReact={(emoji) => onReact(message.id, emoji)}
            />
          </div>
        )}

        {/* Local delivery status for optimistic/offline messages */}
        {isSelf && message.temp_id && message.client_state && (
          <div className="px-1 flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
            {message.client_state === 'queued' && (
              <>
                <CloudOff className="w-3 h-3" />
                <span>{t('message.queuedOffline')}</span>
                {canRetryOutbox && (
                  <button
                    onClick={() => onRetryOutbox!(message.temp_id!)}
                    className="ml-1 underline hover:text-[var(--color-accent)] cursor-pointer"
                  >
                    {t('message.retryNow')}
                  </button>
                )}
              </>
            )}
            {message.client_state === 'failed' && (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>{t('message.deliveryFailed')}</span>
                {canRetryOutbox && (
                  <button
                    onClick={() => onRetryOutbox!(message.temp_id!)}
                    className="ml-1 underline hover:text-[var(--color-accent)] cursor-pointer"
                  >
                    {t('message.retryNow')}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Thinking toggle */}
        {layers.thinking && (
          <div className="px-1">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            >
              <Brain className="w-3 h-3" />
              <span>{t('message.thinking')}</span>
              {showThinking ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showThinking && (
              <div className="mt-1 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded-lg text-[11px] text-[var(--color-text-muted)] leading-relaxed italic max-h-32 overflow-y-auto max-w-full">
                {layers.thinking}
              </div>
            )}
          </div>
        )}

        {/* Mention intent badge */}
        {!!layers.data?.mention_intent && (() => {
          const intent = layers.data.mention_intent
          const intentType = typeof intent === 'object' && intent !== null && 'type' in (intent as object)
            ? String((intent as Record<string, unknown>).type)
            : 'task_assign'
          return (
            <div className="px-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-[10px] font-medium text-[var(--color-accent)]">
                {t(`mentionIntent.${intentType}`)}
              </span>
            </div>
          )
        })()}

        {/* Mentions */}
        {message.mentions && message.mentions.length > 0 && !layers.data?.mention_intent && (
          <div className="px-1 flex items-center gap-1 text-[10px] text-[var(--color-accent)] opacity-60">
            @{message.mentions.length} {t('message.mentioned')}
          </div>
        )}
      </div>
    </div>

    {/* Image Lightbox */}
    {lightboxImage && (
      <ImageLightbox
        url={lightboxImage.url}
        alt={lightboxImage.alt}
        onClose={() => setLightboxImage(null)}
      />
    )}
  </>
  )
}
