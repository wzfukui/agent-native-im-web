import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity, Conversation } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import {
  Bot, Plus, Trash2, Copy, Check, Key, Loader2, X,
  Shield, Wifi, WifiOff, ChevronRight, MessageSquare, Users,
  Sparkles, FileText, Settings, ArrowLeft,
} from 'lucide-react'

interface Props {
  onClose: () => void
  onStartChat: (entityId: number) => void
}

export function BotManager({ onClose, onStartChat }: Props) {
  const token = useAuthStore((s) => s.token)!
  const online = usePresenceStore((s) => s.online)
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createdKey, setCreatedKey] = useState<{ entity: Entity; key: string; doc: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedBot, setSelectedBot] = useState<Entity | null>(null)
  const [botConversations, setBotConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct')

  const loadEntities = async () => {
    const res = await api.listEntities(token)
    if (res.ok && res.data) setEntities(Array.isArray(res.data) ? res.data : [])
    setLoading(false)
  }

  useEffect(() => { loadEntities() }, [])

  // Load conversations when bot is selected
  useEffect(() => {
    if (selectedBot && token) {
      setLoadingConvs(true)
      api.listConversations(token).then(res => {
        if (res.ok && res.data) {
          const convs = (res.data as Conversation[]).filter(c => 
            c.participants?.some(p => p.entity_id === selectedBot.id)
          )
          setBotConversations(convs)
        }
        setLoadingConvs(false)
      })
    }
  }, [selectedBot, token])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await api.createEntity(token, newName.trim())
    if (res.ok && res.data) {
      setCreatedKey({ entity: res.data.entity, key: res.data.bootstrap_key, doc: res.data.markdown_doc })
      setNewName('')
      loadEntities()
    }
    setCreating(false)
  }

  const handleDelete = async (id: number) => {
    await api.deleteEntity(token, id)
    loadEntities()
    if (selectedBot?.id === id) setSelectedBot(null)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const bots = entities.filter((e) => e.entity_type !== 'user')
  const directConvs = botConversations.filter(c => c.conv_type === 'direct')
  const groupConvs = botConversations.filter(c => c.conv_type === 'group' || c.conv_type === 'channel')

  // Render bot detail view
  if (selectedBot) {
    const isOnline = online.has(selectedBot.id)
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="w-full max-w-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          {/* Header with back button */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedBot(null)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bot)]/15 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[var(--color-bot)]" />
                </div>
                <h2 className="text-base font-semibold">{entityDisplayName(selectedBot)}</h2>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1',
                  isOnline ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
                )}>
                  {isOnline ? <><Wifi className="w-2.5 h-2.5" /> Online</> : <><WifiOff className="w-2.5 h-2.5" /> Offline</>}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Top: Bot Basic Info */}
            <div className="p-5 border-b border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                <EntityAvatar entity={selectedBot} size="lg" showStatus />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {entityDisplayName(selectedBot)}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    @{selectedBot.name}
                  </p>
                  
                  {/* Description from metadata */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Capabilities</p>
                        <p className="text-sm text-[var(--color-text-primary)] mt-0.5">
                          {selectedBot.metadata?.description as string || 'AI Assistant powered by large language model'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-[var(--color-bot)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Services</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs">
                            Text Chat
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-bot)]/10 text-[var(--color-bot)] text-xs">
                            Code Generation
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs">
                            Problem Solving
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Tabbed Conversations */}
            <div className="p-5">
              <div className="flex items-center gap-1 mb-4 bg-[var(--color-bg-tertiary)] p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('direct')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                    activeTab === 'direct' 
                      ? 'bg-[var(--color-bg-secondary)] shadow-sm text-[var(--color-text-primary)]' 
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Direct
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[10px]">
                    {directConvs.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                    activeTab === 'groups' 
                      ? 'bg-[var(--color-bg-secondary)] shadow-sm text-[var(--color-text-primary)]' 
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Groups
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[10px]">
                    {groupConvs.length}
                  </span>
                </button>
              </div>

              {loadingConvs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {(activeTab === 'direct' ? directConvs : groupConvs).map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onStartChat(selectedBot.id)
                        onClose()
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-left group"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        conv.conv_type === 'direct' ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--color-bot)]/10'
                      )}>
                        {conv.conv_type === 'direct' ? (
                          <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
                        ) : (
                          <Users className="w-4 h-4 text-[var(--color-bot)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {conv.title || 'Unnamed Conversation'}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  {(activeTab === 'direct' ? directConvs : groupConvs).length === 0 && (
                    <p className="text-center text-xs text-[var(--color-text-muted)] py-6">
                      No {activeTab} conversations yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render list view
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/30 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bot)]/15 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[var(--color-bot)]" />
            </div>
            <h2 className="text-base font-semibold">Agent Management</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Create new bot */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Create New Agent</label>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Agent name (e.g. fullstack-dev)"
                className="flex-1 h-9 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="h-9 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create
              </button>
            </div>
          </div>

          {/* Bootstrap key display */}
          {createdKey && (
            <div className="p-4 rounded-xl bg-[var(--color-success)]/8 border border-[var(--color-success)]/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--color-success)]" />
                  <span className="text-sm font-medium text-[var(--color-success)]">
                    {entityDisplayName(createdKey.entity)} created!
                  </span>
                </div>
                <button
                  onClick={() => setCreatedKey(null)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-3 py-2 rounded-lg break-all">
                  {createdKey.key}
                </code>
                <button
                  onClick={() => handleCopy(createdKey.key)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
                </button>
              </div>
              <button
                onClick={() => {
                  const config = `# Bot API 配置信息
API_URL: ${window.location.origin}/api/v1/ws
API_KEY: ${createdKey.key}

# 大模型接入指南
MODEL_PROVIDER: dashscope
MODEL_NAME: qwen3.5-plus
API_BASE: https://dashscope.aliyuncs.com/compatible-mode/v1`
                  handleCopy(config);
                }}
                className="w-full py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Full API Config
              </button>
            </div>
          )}

          {/* Entity list */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Your Agents ({bots.length})
            </label>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {bots.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors group cursor-pointer"
                    onClick={() => setSelectedBot(entity)}
                  >
                    <EntityAvatar entity={entity} size="sm" showStatus />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {entityDisplayName(entity)}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        {online.has(entity.id) ? (
                          <><Wifi className="w-2.5 h-2.5 text-[var(--color-success)]" /> Online</>
                        ) : (
                          <><WifiOff className="w-2.5 h-2.5" /> Offline</>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onStartChat(entity.id) }}
                      className="opacity-0 group-hover:opacity-100 h-7 px-2.5 rounded-md bg-[var(--color-accent-dim)] text-[var(--color-accent)] text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-all hover:bg-[var(--color-accent)]/20"
                    >
                      Chat <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entity.id) }}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md hover:bg-[var(--color-error)]/15 flex items-center justify-center cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
                    </button>
                  </div>
                ))}
                {bots.length === 0 && (
                  <p className="text-center text-xs text-[var(--color-text-muted)] py-6">
                    No agents yet. Create one above!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
