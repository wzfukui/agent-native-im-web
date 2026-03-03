import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import {
  Bot, Plus, Search, Loader2, X, Key, Copy, Check,
  FileText, ChevronDown, ChevronUp, MessageSquare, Wifi, WifiOff,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  selectedId: number | null
  onSelect: (id: number) => void
  onStartChat: (entityId: number) => void
}

export function BotList({ selectedId, onSelect, onStartChat }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const online = usePresenceStore((s) => s.online)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createdKey, setCreatedKey] = useState<{ entity: Entity; key: string; doc: string } | null>(null)
  const [copied, setCopied] = useState<string | false>(false)
  const [docExpanded, setDocExpanded] = useState(false)

  const loadEntities = async () => {
    const res = await api.listEntities(token)
    if (res.ok && res.data) setEntities(Array.isArray(res.data) ? res.data : [])
    setLoading(false)
  }

  useEffect(() => { loadEntities() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await api.createEntity(token, newName.trim())
    if (res.ok && res.data) {
      setCreatedKey({ entity: res.data.entity, key: res.data.bootstrap_key, doc: res.data.markdown_doc })
      setNewName('')
      setShowCreate(false)
      loadEntities()
    }
    setCreating(false)
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(false), 2000)
  }

  const bots = entities.filter((e) => e.entity_type !== 'user')
  const filtered = search
    ? bots.filter((e) =>
        e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.name?.toLowerCase().includes(search.toLowerCase())
      )
    : bots

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4.5 h-4.5 text-[var(--color-bot)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('bot.agents')}</h2>
          <span className="text-xs text-[var(--color-text-muted)]">({bots.length})</span>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreatedKey(null) }}
          className="w-8 h-8 rounded-lg bg-[var(--color-bot)]/10 hover:bg-[var(--color-bot)]/20 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[var(--color-bot)]" />
        </button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className="px-3 pb-2">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={t('bot.namePlaceholder')}
              autoFocus
              className="flex-1 h-8 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-bot)]/50"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="h-8 px-3 rounded-lg bg-[var(--color-bot)] hover:bg-[var(--color-bot)]/80 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {t('common.create')}
            </button>
          </div>
        </div>
      )}

      {/* Created key card */}
      {createdKey && (
        <div className="px-3 pb-2">
          <div className="rounded-lg bg-[var(--color-success)]/8 border border-[var(--color-success)]/20 overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span className="text-xs font-medium text-[var(--color-success)]">
                  {entityDisplayName(createdKey.entity)} {t('bot.created')}
                </span>
              </div>
              <button
                onClick={() => { setCreatedKey(null); setDocExpanded(false) }}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
              >
                {t('common.dismiss')}
              </button>
            </div>

            {/* Connection fields */}
            <div className="px-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase w-10 flex-shrink-0">API</span>
                <code className="flex-1 text-[10px] font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2 py-1 rounded truncate">
                  {window.location.origin}/api/v1
                </code>
                <button
                  onClick={() => handleCopy(`${window.location.origin}/api/v1`, 'api')}
                  className="w-6 h-6 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  {copied === 'api' ? <Check className="w-2.5 h-2.5 text-[var(--color-success)]" /> : <Copy className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase w-10 flex-shrink-0">Token</span>
                <code className="flex-1 text-[10px] font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2 py-1 rounded truncate">
                  {createdKey.key}
                </code>
                <button
                  onClick={() => handleCopy(createdKey.key, 'token')}
                  className="w-6 h-6 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  {copied === 'token' ? <Check className="w-2.5 h-2.5 text-[var(--color-success)]" /> : <Copy className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-3 pt-2 pb-1.5 flex gap-1.5">
              <button
                onClick={() => handleCopy(createdKey.doc, 'doc')}
                className="flex-1 py-1.5 rounded bg-[var(--color-bot)] hover:bg-[var(--color-bot)]/80 text-white text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                {copied === 'doc' ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {copied === 'doc' ? t('invite.copied') : t('bot.copyDoc')}
              </button>
              <button
                onClick={() => {
                  const envConfig = `IM_SERVER=${window.location.origin}\nBOT_TOKEN=${createdKey.key}`
                  handleCopy(envConfig, 'env')
                }}
                className="flex-1 py-1.5 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors border border-[var(--color-border)]"
              >
                {copied === 'env' ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                {copied === 'env' ? t('invite.copied') : '.env'}
              </button>
            </div>

            {/* Collapsible doc preview */}
            <div className="px-3 pb-2">
              <button
                onClick={() => setDocExpanded(!docExpanded)}
                className="w-full flex items-center justify-center gap-1 py-1 text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
              >
                {docExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                {docExpanded ? t('bot.collapseDoc') : t('bot.expandDoc')}
              </button>
              {docExpanded && (
                <div className="mt-1 p-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] max-h-48 overflow-y-auto text-[10px] prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{createdKey.doc}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Start chat button */}
            <div className="px-3 pb-3">
              <button
                onClick={() => onStartChat(createdKey.entity.id)}
                className="w-full py-1.5 rounded bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                {t('bot.startChat')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('bot.searchPlaceholder')}
            className="w-full h-8 pl-8.5 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Bot list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">{search ? t('common.noMatches') : t('bot.noAgents')}</p>
          </div>
        ) : (
          filtered.map((entity) => {
            const isOnline = online.has(entity.id)
            const isActive = entity.id === selectedId
            return (
              <button
                key={entity.id}
                onClick={() => onSelect(entity.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left cursor-pointer',
                  isActive
                    ? 'bg-[var(--color-accent-dim)]'
                    : 'hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <EntityAvatar entity={entity} size="sm" showStatus />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {entityDisplayName(entity)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                    {isOnline ? (
                      <><Wifi className="w-2.5 h-2.5 text-[var(--color-success)]" /> {t('common.online')}</>
                    ) : (
                      <><WifiOff className="w-2.5 h-2.5" /> {t('common.offline')}</>
                    )}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
