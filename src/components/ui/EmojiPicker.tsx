import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const EMOJI_CATEGORIES = [
  {
    key: 'smileys',
    label: 'Smileys',
    icon: '\uD83D\uDE00',
    emojis: [
      '\uD83D\uDE00', '\uD83D\uDE03', '\uD83D\uDE04', '\uD83D\uDE01', '\uD83D\uDE06', '\uD83D\uDE05', '\uD83D\uDE02', '\uD83E\uDD23',
      '\uD83D\uDE0A', '\uD83D\uDE07', '\uD83D\uDE42', '\uD83D\uDE43', '\uD83D\uDE09', '\uD83D\uDE0C', '\uD83D\uDE0D', '\uD83E\uDD70',
      '\uD83D\uDE18', '\uD83D\uDE17', '\uD83D\uDE19', '\uD83D\uDE1A', '\uD83D\uDE0B', '\uD83D\uDE1B', '\uD83D\uDE1C', '\uD83E\uDD2A',
      '\uD83D\uDE1D', '\uD83E\uDD11', '\uD83E\uDD17', '\uD83E\uDD14', '\uD83E\uDD2D', '\uD83E\uDD2B', '\uD83E\uDD25', '\uD83D\uDE36',
      '\uD83D\uDE10', '\uD83D\uDE11', '\uD83D\uDE12', '\uD83D\uDE44', '\uD83D\uDE0F', '\uD83D\uDE23', '\uD83D\uDE25', '\uD83E\uDD7A',
      '\uD83D\uDE22', '\uD83D\uDE2D', '\uD83D\uDE24', '\uD83D\uDE20', '\uD83D\uDE21', '\uD83E\uDD2C', '\uD83E\uDD2F', '\uD83D\uDE33',
      '\uD83E\uDD75', '\uD83E\uDD76', '\uD83D\uDE31', '\uD83D\uDE28', '\uD83D\uDE30', '\uD83D\uDE25', '\uD83D\uDE13', '\uD83E\uDD2E',
    ],
  },
  {
    key: 'gestures',
    label: 'Gestures',
    icon: '\uD83D\uDC4D',
    emojis: [
      '\uD83D\uDC4D', '\uD83D\uDC4E', '\u270A', '\uD83D\uDC4A', '\uD83E\uDD1B', '\uD83E\uDD1C', '\uD83D\uDC4F',
      '\uD83D\uDE4C', '\uD83D\uDC50', '\uD83E\uDD32', '\uD83E\uDD1D', '\uD83D\uDE4F', '\u270D\uFE0F', '\uD83D\uDC85',
      '\uD83E\uDD33', '\uD83D\uDCAA', '\uD83E\uDDB5', '\uD83E\uDDB6', '\uD83D\uDC42', '\uD83D\uDC40', '\uD83D\uDC41\uFE0F',
      '\uD83D\uDC45', '\uD83D\uDC44', '\u2764\uFE0F', '\uD83D\uDC9B', '\uD83D\uDC9A', '\uD83D\uDC99', '\uD83D\uDC9C', '\uD83D\uDDA4',
    ],
  },
  {
    key: 'objects',
    label: 'Objects',
    icon: '\uD83C\uDF89',
    emojis: [
      '\uD83C\uDF89', '\uD83C\uDF8A', '\uD83C\uDF88', '\uD83C\uDF81', '\uD83C\uDF96\uFE0F', '\uD83C\uDFC6', '\uD83C\uDFC5',
      '\u2B50', '\uD83C\uDF1F', '\uD83C\uDF1E', '\u2728', '\uD83D\uDD25', '\uD83D\uDCA5', '\uD83D\uDCA2', '\uD83D\uDCA8',
      '\uD83D\uDCAF', '\uD83D\uDCA1', '\uD83D\uDCDD', '\uD83D\uDCCC', '\uD83D\uDD10', '\uD83D\uDD11', '\uD83D\uDD12', '\uD83D\uDCE6',
      '\uD83D\uDCC8', '\uD83D\uDCC9', '\uD83D\uDCCA', '\uD83D\uDE80', '\u2705', '\u274C', '\u2757', '\u2753',
    ],
  },
  {
    key: 'food',
    label: 'Food',
    icon: '\uD83C\uDF55',
    emojis: [
      '\uD83C\uDF4E', '\uD83C\uDF4A', '\uD83C\uDF4B', '\uD83C\uDF49', '\uD83C\uDF47', '\uD83C\uDF53', '\uD83C\uDF51',
      '\uD83C\uDF52', '\uD83C\uDF50', '\uD83E\uDD51', '\uD83C\uDF45', '\uD83C\uDF55', '\uD83C\uDF54', '\uD83C\uDF5F',
      '\uD83C\uDF70', '\uD83C\uDF69', '\uD83C\uDF66', '\u2615', '\uD83C\uDF7A', '\uD83C\uDF77', '\uD83E\uDD42',
    ],
  },
]

interface Props {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onSelect, onClose }: Props) {
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].key)

  const category = EMOJI_CATEGORIES.find((c) => c.key === activeCategory) || EMOJI_CATEGORIES[0]

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="absolute z-20 bottom-full mb-1 w-[260px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden"
        style={{ animation: 'slide-up 0.15s ease-out' }}
      >
        {/* Category tabs */}
        <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-b border-[var(--color-border)]">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex-1 h-7 flex items-center justify-center rounded-md text-sm cursor-pointer transition-colors',
                activeCategory === cat.key
                  ? 'bg-[var(--color-accent-dim)]'
                  : 'hover:bg-[var(--color-bg-hover)]',
              )}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-0.5 p-1.5 max-h-[180px] overflow-y-auto">
          {category.emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose() }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors text-base cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
