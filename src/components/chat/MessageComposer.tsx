import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Paperclip, X, Image as ImageIcon, FileText, Mic, CornerUpLeft } from 'lucide-react'
import { cn, formatFileSize, entityDisplayName } from '@/lib/utils'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { useAudioRecorder } from '@/lib/use-audio-recorder'
import type { Participant, Message } from '@/lib/types'

interface Props {
  onSend: (text: string, attachments?: File[], mentions?: number[]) => void
  onAudioSend?: (blob: Blob, duration: number) => void
  onFileUpload?: (file: File) => Promise<string | null>
  onTyping?: () => void
  disabled?: boolean
  placeholder?: string
  participants?: Participant[]
  isObserver?: boolean
  replyTo?: Message | null
  onCancelReply?: () => void
}

export function MessageComposer({ onSend, onAudioSend, onFileUpload, onTyping, disabled, placeholder, participants, isObserver, replyTo, onCancelReply }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [mentionIds, setMentionIds] = useState<number[]>([])
  const { state: recState, duration: recDuration, start: recStart, stop: recStop, cancel: recCancel } = useAudioRecorder()

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1) // cursor position of '@'

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionRef = useRef<HTMLDivElement>(null)

  // Filter participants by mention query
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null || !participants) return []
    const q = mentionQuery.toLowerCase()
    return participants
      .filter((p) => p.entity)
      .filter((p) => {
        const name = p.entity!.name.toLowerCase()
        const display = (p.entity!.display_name || '').toLowerCase()
        return name.includes(q) || display.includes(q)
      })
      .slice(0, 8)
  }, [mentionQuery, participants])

  // Reset mention index when candidates change
  useEffect(() => {
    setMentionIndex(0)
  }, [mentionCandidates.length])

  // Focus textarea when reply is set
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus()
  }, [replyTo])

  // Typing indicator (throttle 3s)
  const lastTypingRef = useRef(0)
  const emitTyping = useCallback(() => {
    if (!onTyping) return
    const now = Date.now()
    if (now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now
      onTyping()
    }
  }, [onTyping])

  const insertMention = useCallback((participant: Participant) => {
    if (!participant.entity || mentionStart < 0) return
    const before = text.slice(0, mentionStart)
    const after = text.slice(textareaRef.current?.selectionStart ?? text.length)
    const displayName = entityDisplayName(participant.entity)
    const newText = `${before}@${displayName} ${after}`
    setText(newText)
    setMentionIds((prev) => prev.includes(participant.entity_id) ? prev : [...prev, participant.entity_id])
    setMentionQuery(null)
    setMentionStart(-1)
    // Focus and set cursor after inserted mention
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        const cursorPos = before.length + displayName.length + 2 // @name + space
        ta.focus()
        ta.setSelectionRange(cursorPos, cursorPos)
      }
    }, 0)
  }, [text, mentionStart])

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    onSend(trimmed, files.length > 0 ? files : undefined, mentionIds.length > 0 ? mentionIds : undefined)
    setText('')
    setFiles([])
    setMentionIds([])
    setMentionQuery(null)
    textareaRef.current?.focus()
  }, [text, files, mentionIds, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention autocomplete navigation
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(mentionCandidates[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        setMentionStart(-1)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleRecordStart = useCallback(async () => {
    try {
      await recStart()
    } catch {
      // Mic permission denied or not available
    }
  }, [recStart])

  const handleRecordSend = useCallback(async () => {
    const { blob, duration } = await recStop()
    if (blob.size > 0 && onAudioSend) {
      onAudioSend(blob, duration)
    }
  }, [recStop, onAudioSend])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    const value = ta.value
    setText(value)
    emitTyping()

    // Detect @mention trigger
    const cursor = ta.selectionStart
    const textBeforeCursor = value.slice(0, cursor)
    // Find the last '@' that isn't preceded by a word char
    const atMatch = textBeforeCursor.match(/(^|[^a-zA-Z0-9])@([^\s@]*)$/)
    if (atMatch && participants && participants.length > 0) {
      setMentionQuery(atMatch[2])
      setMentionStart(cursor - atMatch[2].length - 1) // position of '@'
    } else {
      setMentionQuery(null)
      setMentionStart(-1)
    }
  }

  if (isObserver) {
    return (
      <div className="px-4 pb-4 pt-2">
        <div className="rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">
          {t('conversation.observer')}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 pt-2 relative">
      {/* @mention autocomplete popover */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-4 right-4 mb-1 max-h-52 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl shadow-black/20 z-20"
        >
          {mentionCandidates.map((p, i) => (
            <button
              key={p.entity_id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(p) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer',
                i === mentionIndex
                  ? 'bg-[var(--color-accent)]/10'
                  : 'hover:bg-[var(--color-bg-hover)]',
              )}
            >
              <EntityAvatar entity={p.entity} size="xs" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate block">
                  {entityDisplayName(p.entity)}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  @{p.entity?.name}
                  {p.entity?.entity_type !== 'user' && (
                    <span className="ml-1 px-1 py-0.5 rounded bg-[var(--color-bot)]/15 text-[var(--color-bot)]">
                      {p.entity?.entity_type}
                    </span>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border-l-2 border-[var(--color-accent)]">
          <CornerUpLeft className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[var(--color-accent)]">
              {t('chat.replyTo', { name: entityDisplayName(replyTo.sender) })}
            </span>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              {(replyTo.layers?.summary || '').slice(0, 80)}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--color-bg-hover)] cursor-pointer flex-shrink-0"
          >
            <X className="w-3 h-3 text-[var(--color-text-muted)]" />
          </button>
        </div>
      )}

      {/* Attached files preview */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              )}
              <span className="text-[var(--color-text-secondary)] max-w-[100px] truncate">{file.name}</span>
              <span className="text-[var(--color-text-muted)]">{formatFileSize(file.size)}</span>
              <button onClick={() => removeFile(i)} className="cursor-pointer hover:text-[var(--color-error)] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention badges */}
      {mentionIds.length > 0 && participants && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {mentionIds.map((eid) => {
            const p = participants.find((pp) => pp.entity_id === eid)
            return (
              <span key={eid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] font-medium">
                @{entityDisplayName(p?.entity)}
                <button
                  onClick={() => setMentionIds((prev) => prev.filter((id) => id !== eid))}
                  className="hover:text-[var(--color-error)] cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus-within:border-[var(--color-accent)]/50 transition-colors">
        {recState === 'recording' ? (
          /* Recording UI */
          <>
            <div className="flex items-center gap-3 flex-1 py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-sm text-[var(--color-text-primary)] font-mono tabular-nums">
                {Math.floor(recDuration / 60)}:{String(recDuration % 60).padStart(2, '0')}
              </span>
              <div className="flex-1 h-5 flex items-center gap-0.5">
                {Array.from({ length: 20 }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-red-400/60"
                    style={{
                      height: `${6 + Math.sin((Date.now() / 200 + i) * 0.8) * 8}px`,
                      transition: 'height 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={recCancel}
              className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleRecordSend}
              className="w-8 h-8 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition-all shadow-sm shadow-[var(--color-accent)]/25"
            >
              <Send className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Normal input UI */
          <>
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              onPaste={(e) => {
                const items = e.clipboardData?.items
                if (!items) return
                const imageFiles: File[] = []
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile()
                    if (file) imageFiles.push(file)
                  }
                }
                if (imageFiles.length > 0) {
                  e.preventDefault()
                  setFiles((prev) => [...prev, ...imageFiles])
                }
              }}
              placeholder={placeholder || t('conversation.typeMessage')}
              disabled={disabled}
              rows={1}
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none leading-relaxed max-h-[120px] py-1"
            />

            {/* Send or Mic button */}
            {text.trim() || files.length > 0 ? (
              <button
                onClick={handleSubmit}
                disabled={disabled}
                className="w-8 h-8 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white flex items-center justify-center flex-shrink-0 transition-all cursor-pointer shadow-sm shadow-[var(--color-accent)]/25"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : onAudioSend ? (
              <button
                onClick={handleRecordStart}
                disabled={disabled}
                className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                <Mic className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
