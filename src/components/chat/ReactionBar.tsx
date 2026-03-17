import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import type { ReactionSummary } from '@/lib/types'

const QUICK_EMOJIS = ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83C\uDF89', '\uD83E\uDD14', '\uD83D\uDC40']

interface Props {
  reactions: ReactionSummary[]
  myEntityId: number
  isSelf: boolean
  onReact: (emoji: string) => void
}

export function ReactionBar({ reactions, myEntityId, isSelf, onReact }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [showFullPicker, setShowFullPicker] = useState(false)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', isSelf ? 'justify-end' : '')}>
      {reactions.map((r) => {
        const isMine = r.entity_ids.includes(myEntityId)
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(r.emoji)}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors cursor-pointer',
              isMine
                ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/30',
            )}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
        )
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          ref={addButtonRef}
          onClick={() => setShowPicker(!showPicker)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
        >
          <Plus className="w-3 h-3" />
        </button>

        {showPicker && !showFullPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
            <div className={cn(
              'absolute z-20 bottom-full mb-1 flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-lg',
              isSelf ? 'right-0' : 'left-0',
            )}>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(emoji); setShowPicker(false) }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors text-base cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
              {/* More button to open full picker */}
              <button
                onClick={() => setShowFullPicker(true)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors text-xs cursor-pointer text-[var(--color-text-muted)]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {showPicker && showFullPicker && (
          <div className={cn('absolute z-20', isSelf ? 'right-0' : 'left-0')}>
            <EmojiPicker
              onSelect={(emoji) => {
                onReact(emoji)
                setShowPicker(false)
                setShowFullPicker(false)
              }}
              onClose={() => {
                setShowPicker(false)
                setShowFullPicker(false)
              }}
              anchorRef={addButtonRef}
              position="above"
            />
          </div>
        )}
      </div>
    </div>
  )
}
