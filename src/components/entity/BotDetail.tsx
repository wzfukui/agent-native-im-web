import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity, Conversation } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import {
  Bot, ArrowLeft, Wifi, WifiOff, Shield, Sparkles, FileText,
  MessageSquare, Users, ChevronRight, Loader2, Trash2, Zap,
} from 'lucide-react'

interface Props {
  bot: Entity | null
  onBack: () => void
  onOpenConversation: (convId: number) => void
  onDelete: (id: number) => void
  onStartChat: (entityId: number) => void
}

export function BotDetail({ bot, onBack, onOpenConversation, onDelete, onStartChat }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const online = usePresenceStore((s) => s.online)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!bot) return
    setLoadingConvs(true)
    setActiveTab('direct')
    setConfirmDelete(false)
    api.listConversations(token).then((res) => {
      if (res.ok && res.data) {
        const convs = (res.data as Conversation[]).filter((c) =>
          c.participants?.some((p) => p.entity_id === bot.id)
        )
        setConversations(convs)
      }
      setLoadingConvs(false)
    })
  }, [bot?.id, token])

  // Empty state
  if (!bot) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-bot)]/10 to-[var(--color-accent)]/10 flex items-center justify-center">
          <Bot className="w-10 h-10 text-[var(--color-bot)] opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">Agent Details</p>
          <p className="text-xs mt-1">Select an agent to view details</p>
        </div>
      </div>
    )
  }

  const isOnline = online.has(bot.id)
  const meta = bot.metadata as Record<string, unknown> | undefined
  const description = (meta?.description as string) || ''
  const caps = (meta?.capabilities as string[]) || []
  const directConvs = conversations.filter((c) => c.conv_type === 'direct')
  const groupConvs = conversations.filter((c) => c.conv_type === 'group' || c.conv_type === 'channel')
  const tabConvs = activeTab === 'direct' ? directConvs : groupConvs

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <button
          onClick={onBack}
          className="lg:hidden w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <EntityAvatar entity={bot} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {entityDisplayName(bot)}
          </h2>
          <p className="text-[10px] text-[var(--color-text-muted)]">@{bot.name}</p>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1',
          isOnline
            ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
            : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
        )}>
          {isOnline ? <><Wifi className="w-2.5 h-2.5" /> Online</> : <><WifiOff className="w-2.5 h-2.5" /> Offline</>}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Bot info */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-start gap-4">
            <EntityAvatar entity={bot} size="lg" showStatus />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {entityDisplayName(bot)}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  @{bot.name} · {bot.entity_type}
                </p>
              </div>

              {/* Description */}
              {description && (
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--color-text-primary)]">{description}</p>
                </div>
              )}

              {/* Capabilities */}
              {caps.length > 0 && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-bot)] mt-0.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {caps.map((cap, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onStartChat(bot.id)}
              className="flex-1 py-2 rounded-lg bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              New Conversation
            </button>

            {!isOnline && (
              <button
                onClick={async () => {
                  await api.approveConnection(token, bot.id)
                }}
                className="flex-1 py-2 rounded-lg bg-[var(--color-success)]/15 hover:bg-[var(--color-success)]/25 text-[var(--color-success)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                {t('bot.approveConnection')}
              </button>
            )}

            {confirmDelete ? (
              <div className="flex gap-1.5">
                <button
                  onClick={() => { onDelete(bot.id); setConfirmDelete(false) }}
                  className="py-2 px-3 rounded-lg bg-[var(--color-error)]/15 hover:bg-[var(--color-error)]/25 text-[var(--color-error)] text-xs font-medium cursor-pointer transition-colors"
                >
                  {t('common.confirm')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="py-2 px-3 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] text-xs font-medium cursor-pointer transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="py-2 px-3 rounded-lg hover:bg-[var(--color-error)]/15 text-[var(--color-text-muted)] hover:text-[var(--color-error)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations tabs */}
        <div className="p-4">
          <div className="flex items-center gap-1 mb-3 bg-[var(--color-bg-secondary)] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('direct')}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                activeTab === 'direct'
                  ? 'bg-[var(--color-bg-primary)] shadow-sm text-[var(--color-text-primary)]'
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
                  ? 'bg-[var(--color-bg-primary)] shadow-sm text-[var(--color-text-primary)]'
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
              {tabConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onOpenConversation(conv.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-left group cursor-pointer"
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
              {tabConvs.length === 0 && (
                <p className="text-center text-xs text-[var(--color-text-muted)] py-6">
                  No {activeTab === 'direct' ? 'direct' : 'group'} conversations yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
