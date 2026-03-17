import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const RECENT_EMOJIS_KEY = 'emoji-picker-recent'
const MAX_RECENT = 24

interface EmojiCategory {
  key: string
  i18nKey: string
  icon: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    key: 'smileys',
    i18nKey: 'emoji.smileys',
    icon: '\uD83D\uDE00',
    emojis: [
      '\uD83D\uDE00', '\uD83D\uDE03', '\uD83D\uDE04', '\uD83D\uDE01', '\uD83D\uDE06', '\uD83D\uDE05', '\uD83D\uDE02', '\uD83E\uDD23',
      '\uD83D\uDE0A', '\uD83D\uDE07', '\uD83D\uDE42', '\uD83D\uDE43', '\uD83D\uDE09', '\uD83D\uDE0C', '\uD83D\uDE0D', '\uD83E\uDD70',
      '\uD83D\uDE18', '\uD83D\uDE17', '\uD83D\uDE19', '\uD83D\uDE1A', '\uD83D\uDE0B', '\uD83D\uDE1B', '\uD83D\uDE1C', '\uD83E\uDD2A',
      '\uD83D\uDE1D', '\uD83E\uDD11', '\uD83E\uDD17', '\uD83E\uDD14', '\uD83E\uDD2D', '\uD83E\uDD2B', '\uD83E\uDD25', '\uD83D\uDE36',
      '\uD83D\uDE10', '\uD83D\uDE11', '\uD83D\uDE12', '\uD83D\uDE44', '\uD83D\uDE0F', '\uD83D\uDE23', '\uD83D\uDE25', '\uD83E\uDD7A',
      '\uD83D\uDE22', '\uD83D\uDE2D', '\uD83D\uDE24', '\uD83D\uDE20', '\uD83D\uDE21', '\uD83E\uDD2C', '\uD83E\uDD2F', '\uD83D\uDE33',
      '\uD83E\uDD75', '\uD83E\uDD76', '\uD83D\uDE31', '\uD83D\uDE28', '\uD83D\uDE30', '\uD83D\uDE13', '\uD83E\uDD2E', '\uD83E\uDD27',
      '\uD83D\uDE34', '\uD83D\uDE2A', '\uD83D\uDE35', '\uD83E\uDD10', '\uD83E\uDD74', '\uD83E\uDD22', '\uD83D\uDE37', '\uD83E\uDD12',
    ],
  },
  {
    key: 'people',
    i18nKey: 'emoji.people',
    icon: '\uD83D\uDC4B',
    emojis: [
      '\uD83D\uDC4D', '\uD83D\uDC4E', '\u270A', '\uD83D\uDC4A', '\uD83E\uDD1B', '\uD83E\uDD1C', '\uD83D\uDC4F',
      '\uD83D\uDE4C', '\uD83D\uDC50', '\uD83E\uDD32', '\uD83E\uDD1D', '\uD83D\uDE4F', '\u270D\uFE0F', '\uD83D\uDC85',
      '\uD83E\uDD33', '\uD83D\uDCAA', '\uD83E\uDDB5', '\uD83E\uDDB6', '\uD83D\uDC42', '\uD83D\uDC40', '\uD83D\uDC41\uFE0F',
      '\uD83D\uDC45', '\uD83D\uDC44', '\uD83D\uDC76', '\uD83D\uDC66', '\uD83D\uDC67', '\uD83D\uDC68', '\uD83D\uDC69',
      '\uD83D\uDC74', '\uD83D\uDC75', '\uD83D\uDE4D', '\uD83D\uDE4E', '\uD83D\uDE45', '\uD83D\uDE46', '\uD83D\uDC81',
      '\uD83D\uDE47', '\uD83E\uDD26', '\uD83E\uDD37', '\uD83D\uDC4B', '\uD83E\uDD1A', '\uD83D\uDD90\uFE0F', '\u270B',
      '\uD83D\uDC4C', '\uD83E\uDD0F', '\u270C\uFE0F', '\uD83E\uDD1E', '\uD83E\uDD1F', '\uD83E\uDD18', '\uD83D\uDC48', '\uD83D\uDC49',
    ],
  },
  {
    key: 'animals',
    i18nKey: 'emoji.animals',
    icon: '\uD83D\uDC36',
    emojis: [
      '\uD83D\uDC36', '\uD83D\uDC31', '\uD83D\uDC2D', '\uD83D\uDC39', '\uD83D\uDC30', '\uD83E\uDD8A', '\uD83D\uDC3B',
      '\uD83D\uDC3C', '\uD83D\uDC28', '\uD83D\uDC2F', '\uD83E\uDD81', '\uD83D\uDC2E', '\uD83D\uDC37', '\uD83D\uDC38',
      '\uD83D\uDC35', '\uD83D\uDE48', '\uD83D\uDE49', '\uD83D\uDE4A', '\uD83D\uDC12', '\uD83D\uDC14', '\uD83D\uDC27',
      '\uD83D\uDC26', '\uD83D\uDC24', '\uD83D\uDC23', '\uD83D\uDC25', '\uD83E\uDD86', '\uD83E\uDD85', '\uD83E\uDD89',
      '\uD83E\uDD87', '\uD83D\uDC3A', '\uD83D\uDC17', '\uD83D\uDC34', '\uD83E\uDD84', '\uD83D\uDC1D', '\uD83D\uDC1B',
      '\uD83E\uDD8B', '\uD83D\uDC0C', '\uD83D\uDC1E', '\uD83D\uDC1C', '\uD83E\uDD97', '\uD83E\uDD82', '\uD83D\uDC22',
      '\uD83D\uDC0D', '\uD83E\uDD8E', '\uD83D\uDC19', '\uD83E\uDD91', '\uD83E\uDD90', '\uD83E\uDD80', '\uD83D\uDC21',
      '\uD83D\uDC20', '\uD83D\uDC1F', '\uD83D\uDC2C', '\uD83D\uDC33', '\uD83E\uDD88', '\uD83D\uDC0A', '\uD83D\uDC06',
    ],
  },
  {
    key: 'food',
    i18nKey: 'emoji.food',
    icon: '\uD83C\uDF55',
    emojis: [
      '\uD83C\uDF4E', '\uD83C\uDF4A', '\uD83C\uDF4B', '\uD83C\uDF49', '\uD83C\uDF47', '\uD83C\uDF53', '\uD83C\uDF51',
      '\uD83C\uDF52', '\uD83C\uDF50', '\uD83E\uDD51', '\uD83C\uDF45', '\uD83E\uDD65', '\uD83E\uDD66', '\uD83E\uDD52',
      '\uD83C\uDF36\uFE0F', '\uD83C\uDF3D', '\uD83E\uDD55', '\uD83E\uDD54', '\uD83C\uDF55', '\uD83C\uDF54', '\uD83C\uDF5F',
      '\uD83C\uDF2D', '\uD83E\uDD6A', '\uD83C\uDF2E', '\uD83C\uDF2F', '\uD83E\uDD59', '\uD83E\uDD5A', '\uD83C\uDF73',
      '\uD83E\uDD58', '\uD83C\uDF5C', '\uD83C\uDF72', '\uD83E\uDD63', '\uD83E\uDD57', '\uD83C\uDF63', '\uD83C\uDF71',
      '\uD83C\uDF70', '\uD83C\uDF69', '\uD83C\uDF66', '\uD83C\uDF67', '\uD83C\uDF68', '\uD83C\uDF82', '\u2615',
      '\uD83C\uDF7A', '\uD83C\uDF77', '\uD83E\uDD42', '\uD83E\uDD43', '\uD83C\uDF79', '\uD83E\uDD64', '\uD83E\uDDC3',
    ],
  },
  {
    key: 'travel',
    i18nKey: 'emoji.travel',
    icon: '\u2708\uFE0F',
    emojis: [
      '\uD83D\uDE97', '\uD83D\uDE95', '\uD83D\uDE8C', '\uD83D\uDE8E', '\uD83C\uDFCE\uFE0F', '\uD83D\uDE93', '\uD83D\uDE91',
      '\uD83D\uDE92', '\uD83D\uDE90', '\uD83D\uDEB2', '\uD83D\uDEF5', '\uD83D\uDE9E', '\u2708\uFE0F', '\uD83D\uDE80',
      '\uD83D\uDEF8', '\uD83D\uDEA2', '\u26F5', '\uD83C\uDFD6\uFE0F', '\uD83C\uDFD4\uFE0F', '\uD83C\uDFD5\uFE0F',
      '\uD83C\uDFDE\uFE0F', '\uD83C\uDFDD\uFE0F', '\uD83C\uDFDB\uFE0F', '\uD83C\uDFE0', '\uD83C\uDFE2', '\uD83C\uDFE5',
      '\uD83C\uDFEB', '\uD83C\uDFE8', '\u26EA', '\uD83D\uDD4C', '\uD83C\uDFEF', '\uD83C\uDFF0', '\u26F2',
      '\uD83C\uDF05', '\uD83C\uDF04', '\uD83C\uDF06', '\uD83C\uDF07', '\uD83C\uDF09', '\uD83C\uDF03', '\uD83C\uDF0C',
      '\uD83C\uDF20', '\uD83C\uDF87', '\uD83C\uDF86', '\uD83C\uDF08', '\u2600\uFE0F', '\u2601\uFE0F', '\u26C5',
      '\uD83C\uDF24\uFE0F', '\u26C8\uFE0F', '\uD83C\uDF27\uFE0F', '\u2744\uFE0F', '\uD83C\uDF0A', '\uD83C\uDF0D',
    ],
  },
  {
    key: 'objects',
    i18nKey: 'emoji.objects',
    icon: '\uD83D\uDCA1',
    emojis: [
      '\uD83C\uDF89', '\uD83C\uDF8A', '\uD83C\uDF88', '\uD83C\uDF81', '\uD83C\uDF96\uFE0F', '\uD83C\uDFC6', '\uD83C\uDFC5',
      '\u2B50', '\uD83C\uDF1F', '\u2728', '\uD83D\uDD25', '\uD83D\uDCA5', '\uD83D\uDCA2', '\uD83D\uDCA8',
      '\uD83D\uDCAF', '\uD83D\uDCA1', '\uD83D\uDCDD', '\uD83D\uDCCC', '\uD83D\uDD10', '\uD83D\uDD11', '\uD83D\uDD12', '\uD83D\uDCE6',
      '\uD83D\uDCC8', '\uD83D\uDCC9', '\uD83D\uDCCA', '\uD83D\uDE80', '\uD83D\uDCBB', '\uD83D\uDCF1', '\u260E\uFE0F',
      '\uD83D\uDCE7', '\uD83D\uDCE8', '\uD83D\uDCEB', '\uD83D\uDCEA', '\uD83D\uDCC5', '\uD83D\uDCCB', '\uD83D\uDCC3',
      '\uD83D\uDCC4', '\uD83D\uDCF0', '\uD83D\uDCD3', '\uD83D\uDCD5', '\uD83D\uDCD7', '\uD83D\uDCD8', '\uD83D\uDCD9',
      '\uD83D\uDD0D', '\uD83D\uDD0E', '\uD83D\uDCA3', '\uD83D\uDD27', '\uD83D\uDD28', '\u2699\uFE0F', '\uD83D\uDEE0\uFE0F',
    ],
  },
  {
    key: 'symbols',
    i18nKey: 'emoji.symbols',
    icon: '\u2764\uFE0F',
    emojis: [
      '\u2764\uFE0F', '\uD83D\uDC9B', '\uD83D\uDC9A', '\uD83D\uDC99', '\uD83D\uDC9C', '\uD83D\uDDA4', '\uD83E\uDD0D',
      '\uD83E\uDD0E', '\uD83D\uDC94', '\u2763\uFE0F', '\uD83D\uDC95', '\uD83D\uDC9E', '\uD83D\uDC93', '\uD83D\uDC97',
      '\uD83D\uDC96', '\uD83D\uDC98', '\uD83D\uDC9D', '\u2705', '\u274C', '\u2757', '\u2753', '\u2755',
      '\u203C\uFE0F', '\u2049\uFE0F', '\uD83D\uDD34', '\uD83D\uDFE0', '\uD83D\uDFE1', '\uD83D\uDFE2', '\uD83D\uDD35', '\uD83D\uDFE3',
      '\u26AA', '\u26AB', '\uD83D\uDFE4', '\u2B55', '\uD83D\uDEAB', '\uD83D\uDEC7', '\u267B\uFE0F',
      '\uD83C\uDD97', '\uD83C\uDD99', '\uD83C\uDD95', '\uD83C\uDD92', '\uD83C\uDD98', '\uD83C\uDD93', '\uD83C\uDD96',
      '\u2139\uFE0F', '\uD83C\uDD71\uFE0F', '\uD83C\uDD70\uFE0F', '\u267E\uFE0F', '\uD83D\uDD1F', '\uD83D\uDD22', '\uD83D\uDD23', '\uD83D\uDD24',
    ],
  },
  {
    key: 'flags',
    i18nKey: 'emoji.flags',
    icon: '\uD83C\uDFF3\uFE0F',
    emojis: [
      '\uD83C\uDFF3\uFE0F', '\uD83C\uDFF4', '\uD83C\uDFC1', '\uD83D\uDEA9', '\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08',
      '\uD83C\uDDE8\uD83C\uDDF3', '\uD83C\uDDFA\uD83C\uDDF8', '\uD83C\uDDEC\uD83C\uDDE7', '\uD83C\uDDEB\uD83C\uDDF7', '\uD83C\uDDE9\uD83C\uDDEA',
      '\uD83C\uDDEE\uD83C\uDDF9', '\uD83C\uDDEA\uD83C\uDDF8', '\uD83C\uDDF5\uD83C\uDDF9', '\uD83C\uDDF7\uD83C\uDDFA', '\uD83C\uDDEF\uD83C\uDDF5',
      '\uD83C\uDDF0\uD83C\uDDF7', '\uD83C\uDDE6\uD83C\uDDFA', '\uD83C\uDDE7\uD83C\uDDF7', '\uD83C\uDDE8\uD83C\uDDE6', '\uD83C\uDDEE\uD83C\uDDF3',
      '\uD83C\uDDF2\uD83C\uDDFD', '\uD83C\uDDF3\uD83C\uDDF1', '\uD83C\uDDF3\uD83C\uDDF4', '\uD83C\uDDF8\uD83C\uDDEA', '\uD83C\uDDE8\uD83C\uDDED',
      '\uD83C\uDDF9\uD83C\uDDED', '\uD83C\uDDF9\uD83C\uDDF7', '\uD83C\uDDFA\uD83C\uDDE6', '\uD83C\uDDFB\uD83C\uDDF3', '\uD83C\uDDFF\uD83C\uDDE6',
      '\uD83C\uDDEE\uD83C\uDDE9', '\uD83C\uDDF5\uD83C\uDDED', '\uD83C\uDDF2\uD83C\uDDFE', '\uD83C\uDDF8\uD83C\uDDEC', '\uD83C\uDDED\uD83C\uDDF0',
      '\uD83C\uDDF9\uD83C\uDDFC', '\uD83C\uDDF2\uD83C\uDDF4', '\uD83C\uDDEE\uD83C\uDDF1', '\uD83C\uDDE6\uD83C\uDDEA', '\uD83C\uDDF8\uD83C\uDDE6',
    ],
  },
]

// Build a flat searchable map: emoji -> category key (for search)
const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((cat) =>
  cat.emojis.map((e) => ({ emoji: e, category: cat.key })),
)

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_EMOJIS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveRecent(emojis: string[]) {
  try {
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(emojis.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

interface Props {
  onSelect: (emoji: string) => void
  onClose: () => void
  /** Where to position the picker relative to. If not provided, uses default bottom-left. */
  anchorRef?: React.RefObject<HTMLElement | null>
  /** Force position: 'above' places picker above anchor, 'below' places below */
  position?: 'above' | 'below'
}

export function EmojiPicker({ onSelect, onClose, position = 'above' }: Props) {
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState<string | null>(null) // null = recent
  const [search, setSearch] = useState('')
  const [recentEmojis, setRecentEmojis] = useState<string[]>(loadRecent)
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Determine initial tab: show recent if available, else first category
  const effectiveTab = activeCategory ?? (recentEmojis.length > 0 ? 'recent' : EMOJI_CATEGORIES[0].key)

  // Focus search on mount
  useEffect(() => {
    // Slight delay so the picker is rendered
    const timer = setTimeout(() => searchRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [onClose])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use setTimeout to avoid closing immediately from the trigger click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  const handleSelect = useCallback((emoji: string) => {
    // Add to recent
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT)
      saveRecent(next)
      return next
    })
    onSelect(emoji)
    onClose()
  }, [onSelect, onClose])

  // Filtered emojis for search
  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase().trim()
    return ALL_EMOJIS
      .filter(({ category }) => category.toLowerCase().includes(q))
      .map(({ emoji }) => emoji)
  }, [search])

  // Determine which emojis to show
  const displayEmojis = useMemo(() => {
    if (filteredEmojis) return filteredEmojis
    if (effectiveTab === 'recent') return recentEmojis
    const cat = EMOJI_CATEGORIES.find((c) => c.key === effectiveTab)
    return cat?.emojis ?? []
  }, [filteredEmojis, effectiveTab, recentEmojis])

  // Scroll grid to top when changing tabs
  useEffect(() => {
    gridRef.current?.scrollTo(0, 0)
  }, [effectiveTab, search])

  // Position calculation for mobile vs desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <div
      ref={pickerRef}
      className={cn(
        'z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-2xl shadow-black/30 overflow-hidden',
        isMobile
          ? 'fixed inset-x-0 bottom-0 rounded-t-2xl border-b-0'
          : cn(
              'absolute rounded-xl w-[320px]',
              position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
            ),
      )}
      style={{ animation: isMobile ? 'slide-up 0.2s ease-out' : 'slide-up 0.15s ease-out' }}
    >
      {/* Mobile drag handle */}
      {isMobile && (
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-[var(--color-text-muted)]/30" />
        </div>
      )}

      {/* Search bar */}
      <div className="px-2 pt-2 pb-1.5">
        <div className="flex items-center gap-1.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('emoji.search')}
            className="flex-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-[var(--color-border)]">
          {/* Recent tab */}
          {recentEmojis.length > 0 && (
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'w-8 h-7 flex items-center justify-center rounded-md text-sm cursor-pointer transition-colors flex-shrink-0',
                effectiveTab === 'recent'
                  ? 'bg-[var(--color-accent-dim)]'
                  : 'hover:bg-[var(--color-bg-hover)]',
              )}
              title={t('emoji.recent')}
            >
              <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            </button>
          )}
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex-1 h-7 flex items-center justify-center rounded-md text-sm cursor-pointer transition-colors',
                effectiveTab === cat.key
                  ? 'bg-[var(--color-accent-dim)]'
                  : 'hover:bg-[var(--color-bg-hover)]',
              )}
              title={t(cat.i18nKey)}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!search && (
        <div className="px-2.5 pt-1.5 pb-0.5">
          <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            {effectiveTab === 'recent'
              ? t('emoji.recent')
              : t(EMOJI_CATEGORIES.find((c) => c.key === effectiveTab)?.i18nKey ?? '')}
          </span>
        </div>
      )}

      {/* Emoji grid */}
      <div
        ref={gridRef}
        className={cn(
          'grid gap-0.5 p-1.5 overflow-y-auto',
          isMobile ? 'grid-cols-8 max-h-[240px]' : 'grid-cols-8 max-h-[200px]',
        )}
      >
        {displayEmojis.length > 0 ? (
          displayEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => handleSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] transition-colors text-lg cursor-pointer"
            >
              {emoji}
            </button>
          ))
        ) : (
          <div className="col-span-8 py-6 text-center text-xs text-[var(--color-text-muted)]">
            {search ? t('conversation.noMatches') : t('emoji.recent')}
          </div>
        )}
      </div>

      {/* Mobile close button */}
      {isMobile && (
        <div className="px-3 pt-1" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      )}
    </div>
  )
}
