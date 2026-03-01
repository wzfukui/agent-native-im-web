import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import {
  Bot, Plus, Trash2, Copy, Check, Key, Loader2, X,
  Shield, Wifi, WifiOff, ChevronRight,
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
      loadEntities()
    }
    setCreating(false)
  }

  const handleDelete = async (id: number) => {
    await api.deleteEntity(token, id)
    loadEntities()
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
            <div className="p-4 rounded-xl bg-[var(--color-success)]/8 border border-[var(--color-success)]/20 space-y-3" style={{ animation: 'slideUp 0.2s ease-out' }}>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--color-success)]" />
                <span className="text-sm font-medium text-[var(--color-success)]">
                  {entityDisplayName(createdKey.entity)} created!
                </span>
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
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                This is a one-time bootstrap key. The agent will receive a permanent key upon first connection.
              </p>
              <button
                onClick={() => setCreatedKey(null)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Entity list */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Your Agents ({entities.filter((e) => e.entity_type !== 'user').length})
            </label>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-[var(--color-text-muted)]" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div className="space-y-1">
                {entities.filter((e) => e.entity_type !== 'user').map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors group"
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
                      onClick={() => onStartChat(entity.id)}
                      className="opacity-0 group-hover:opacity-100 h-7 px-2.5 rounded-md bg-[var(--color-accent-dim)] text-[var(--color-accent)] text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-all hover:bg-[var(--color-accent)]/20"
                    >
                      Chat <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(entity.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md hover:bg-[var(--color-error)]/15 flex items-center justify-center cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
                    </button>
                  </div>
                ))}
                {entities.filter((e) => e.entity_type !== 'user').length === 0 && (
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
