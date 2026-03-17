import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Loader2, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { entityDisplayName } from '@/lib/utils'
import type { GlobalSearchResult } from '@/lib/types'

interface Props {
  onSelectResult: (conversationId: number, messageId: number) => void
  onClose: () => void
}

export function GlobalSearch({ onSelectResult, onClose }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const PAGE_SIZE = 20

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(async (q: string, newOffset: number, append: boolean) => {
    if (q.length < 2) {
      if (!append) {
        setResults([])
        setHasSearched(false)
      }
      return
    }
    setLoading(true)
    try {
      const res = await api.searchGlobal(token, q, PAGE_SIZE, newOffset)
      if (res.ok && res.data) {
        const msgs = res.data.messages || []
        setResults((prev) => append ? [...prev, ...msgs] : msgs)
        setHasMore(msgs.length === PAGE_SIZE)
        setOffset(newOffset + msgs.length)
      }
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    setOffset(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(value, 0, false)
    }, 300)
  }, [doSearch])

  const handleLoadMore = useCallback(() => {
    doSearch(query, offset, true)
  }, [doSearch, query, offset])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  function highlightMatch(text: string, q: string): React.ReactNode {
    if (!q || q.length < 2) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-[var(--color-accent)]/25 text-[var(--color-text-primary)] rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  function getSnippet(result: GlobalSearchResult): string {
    const summary = result.layers?.summary || ''
    const body = (result.layers?.data as Record<string, unknown>)?.body as string | undefined
    return summary || body || ''
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) {
      return t('app.yesterday')
    }
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div role="dialog" aria-modal="true" aria-label={t('conversation.globalSearchTitle')} className="relative w-full max-w-lg bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={t('conversation.globalSearch')}
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin flex-shrink-0" />}
          <button
            onClick={onClose}
            aria-label={t('a11y.closeDialog')}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">
              {t('conversation.minQueryLength')}
            </p>
          )}

          {hasSearched && results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">{t('conversation.noResults')}</p>
            </div>
          )}

          {results.map((result) => {
            const snippet = getSnippet(result)
            const senderName = entityDisplayName(result.sender)
            return (
              <button
                key={result.id}
                onClick={() => onSelectResult(result.conversation_id, result.id)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer border-b border-[var(--color-border)]/50 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--color-accent)] truncate max-w-[70%]">
                    {result.conversation_title || t('conversation.unnamed')}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0 ml-2">
                    {formatTime(result.created_at)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0 font-medium">
                    {senderName}:
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)] truncate">
                    {highlightMatch(snippet.slice(0, 120), query)}
                    {snippet.length > 120 ? '...' : ''}
                  </span>
                </div>
              </button>
            )
          })}

          {hasMore && !loading && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 text-xs text-[var(--color-accent)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              {t('conversation.loadMore')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
