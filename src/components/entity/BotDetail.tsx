import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity, Conversation } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { AvatarPicker } from './AvatarPicker'
import { entityDisplayName, cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { generateBotQuickstart } from '@/lib/bot-quickstart'
import {
  Bot, ArrowLeft, Wifi, WifiOff, Sparkles, FileText, User,
  MessageSquare, Users, ChevronRight, ChevronDown, ChevronUp, Loader2,
  Hash, Calendar, Tag, Key, Copy, Check, Clock, AlertCircle,
  PowerOff, RotateCcw, Download, Activity, RefreshCw, Link,
} from 'lucide-react'

interface Props {
  bot: Entity | null
  createdCredentials?: { entity: Entity; key: string; doc: string } | null
  onDismissCredentials?: () => void
  onBack: () => void
  onOpenConversation: (convId: number) => void
  onDisable: (id: number) => void
  onReactivate: (id: number) => void
  onHardDelete: (id: number) => void
  onStartChat: (entityId: number) => void
  onRefresh?: () => void
}

export function BotDetail({ bot, createdCredentials, onDismissCredentials, onBack, onOpenConversation, onDisable, onReactivate, onHardDelete, onStartChat, onRefresh }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const online = usePresenceStore((s) => s.online)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct')
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [credStatus, setCredStatus] = useState<{ has_bootstrap: boolean; has_api_key: boolean; bootstrap_prefix: string } | null>(null)
  const [selfCheck, setSelfCheck] = useState<{ ready: boolean; recommendation: string[]; has_api_key: boolean; has_bootstrap: boolean } | null>(null)
  const [diagnostics, setDiagnostics] = useState<{ online: boolean; connections: number; disconnect_count: number; forced_disconnect_count?: number; last_seen?: string; hub: { total_ws_connections: number } } | null>(null)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | false>(false)
  const [docExpanded, setDocExpanded] = useState(false)
  const [rotatingToken, setRotatingToken] = useState(false)
  const [rotatedToken, setRotatedToken] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [opInfo, setOpInfo] = useState<string | null>(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  // Load conversations
  useEffect(() => {
    if (!bot) return
    let cancelled = false
    setLoadingConvs(true)
    setActiveTab('direct')
    setConfirmDisable(false)
    setDocExpanded(false)
    setRotatingToken(false)
    setRotatedToken(null)
    setOpError(null)
    setOpInfo(null)

    api.listConversations(token).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) {
        const convs = (res.data as Conversation[]).filter((c) =>
          c.participants?.some((p) => p.entity_id === bot.id)
        )
        setConversations(convs)
      }
      setLoadingConvs(false)
    }).catch(() => {
      if (!cancelled) setLoadingConvs(false)
    })

    return () => { cancelled = true }
  }, [bot?.id, token])

  // Load credential status + entity status
  useEffect(() => {
    if (!bot) return
    let cancelled = false
    setCredStatus(null)
    setSelfCheck(null)
    setDiagnostics(null)
    setLastSeen(null)

    api.getEntityCredentials(token, bot.id).then((res) => {
      if (!cancelled && res.ok && res.data) setCredStatus(res.data)
    }).catch(() => {})
    api.getEntitySelfCheck(token, bot.id).then((res) => {
      if (!cancelled && res.ok && res.data) setSelfCheck(res.data)
    }).catch(() => {})
    api.getEntityDiagnostics(token, bot.id).then((res) => {
      if (!cancelled && res.ok && res.data) setDiagnostics(res.data)
    }).catch(() => {})

    api.getEntityStatus(token, bot.id).then((res) => {
      if (!cancelled && res.ok && res.data?.last_seen) setLastSeen(res.data.last_seen)
    }).catch(() => {})

    return () => { cancelled = true }
  }, [bot?.id, token])

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      setOpError(t('common.copyFailed'))
      return
    }
    setCopied(label)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQuickstart = () => {
    if (!bot || !accessToken) return
    const quickstart = generateBotQuickstart({
      botName: bot.display_name || bot.name,
      botToken: accessToken,
      apiUrl: `${window.location.origin}/api/v1`,
      webUrl: window.location.origin,
    })
    const blob = new Blob([quickstart], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bot.name || 'agent'}-quickstart.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRegenerateToken = async () => {
    if (!bot || rotatingToken) return
    setRotatingToken(true)
    setOpError(null)
    const res = await api.regenerateEntityToken(token, bot.id)
    if (res.ok && res.data?.api_key) {
      setRotatedToken(res.data.api_key)
      handleCopy(res.data.api_key, 'rotated-token')
      setOpInfo(t('bot.regenerateResult', { count: res.data.disconnected ?? 0 }))
      onRefresh?.()
    } else {
      const detail = typeof res.error === 'string'
        ? res.error
        : (res.error?.message || t('common.errorUnexpected'))
      setOpError(detail)
    }
    setRotatingToken(false)
  }

  // Empty state
  if (!bot) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-bot)]/10 to-[var(--color-accent)]/10 flex items-center justify-center">
          <Bot className="w-10 h-10 text-[var(--color-bot)] opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">{t('bot.agentDetails')}</p>
          <p className="text-xs mt-1">{t('bot.selectAgent')}</p>
        </div>
      </div>
    )
  }

  const isOnline = online.has(bot.id)
  const isDisabled = bot.status === 'disabled'
  const meta = bot.metadata as Record<string, unknown> | undefined
  const description = (meta?.description as string) || ''
  const caps = (meta?.capabilities as string[]) || []
  const tags = (meta?.tags as string[]) || []
  const ownerEntity = bot.owner_id === myEntity?.id ? myEntity : null
  const directConvs = conversations.filter((c) => c.conv_type === 'direct')
  const groupConvs = conversations.filter((c) => c.conv_type === 'group' || c.conv_type === 'channel')
  const tabConvs = activeTab === 'direct' ? directConvs : groupConvs

  // Show full credential card if just created
  const showFullCreds = createdCredentials && createdCredentials.entity.id === bot.id
  // Show pending connection card if has bootstrap but no API key (not yet approved)
  const showPendingCreds = !showFullCreds && credStatus?.has_bootstrap && !credStatus?.has_api_key && !isOnline
  const accessToken = rotatedToken || (showFullCreds ? createdCredentials?.key : null)
  const wsUrlWithToken = accessToken
    ? `${window.location.origin.replace('https://', 'wss://').replace('http://', 'ws://')}/api/v1/ws?token=${encodeURIComponent(accessToken)}`
    : null
  const accessText = accessToken ? [
    `AGENT_IM_BASE=${window.location.origin}/api/v1`,
    `AGENT_IM_TOKEN=${accessToken}`,
    `AGENT_IM_WS=${wsUrlWithToken}`,
    '',
    '# Quick check',
    `curl ${window.location.origin}/api/v1/me -H "Authorization: Bearer ${accessToken}"`,
  ].join('\n') : ''
  const accessUrl = accessToken
    ? `aim-agent://connect?base=${encodeURIComponent(`${window.location.origin}/api/v1`)}&token=${encodeURIComponent(accessToken)}&entity_id=${bot.id}`
    : ''
  const diagnosticsSnapshot = [
    `entity=${bot.id} (${bot.name})`,
    `status=${bot.status}`,
    `online=${diagnostics?.online ?? false}`,
    `connections=${diagnostics?.connections ?? 0}`,
    `hub_ws_total=${diagnostics?.hub?.total_ws_connections ?? 0}`,
    `last_seen=${lastSeen || 'n/a'}`,
    `disconnect_count=${diagnostics?.disconnect_count ?? 0}`,
    `forced_disconnect_count=${diagnostics?.forced_disconnect_count ?? 0}`,
    `api_key=${selfCheck?.has_api_key ?? false}`,
    `bootstrap=${selfCheck?.has_bootstrap ?? false}`,
    `ready=${selfCheck?.ready ?? false}`,
    `recommendation=${(selfCheck?.recommendation || []).join(' | ') || 'none'}`,
  ].join('\n')

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
          isDisabled
            ? 'bg-amber-500/15 text-amber-500'
            : isOnline
              ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
              : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
        )}>
          {isDisabled ? <><PowerOff className="w-2.5 h-2.5" /> {t('bot.disabled')}</> : isOnline ? <><Wifi className="w-2.5 h-2.5" /> {t('common.online')}</> : <><WifiOff className="w-2.5 h-2.5" /> {t('common.offline')}</>}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Full credential card (just created) */}
        {showFullCreds && createdCredentials && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">
                    {entityDisplayName(createdCredentials.entity)} {t('bot.created')} - Bootstrap Key (需批准)
                  </span>
                </div>
                <button
                  onClick={onDismissCredentials}
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
                  <span className="text-[9px] font-medium text-amber-500 uppercase flex-shrink-0">Bootstrap Key (临时)</span>
                  <code className="flex-1 text-[10px] font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2 py-1 rounded truncate">
                    {createdCredentials.key}
                  </code>
                  <button
                    onClick={() => handleCopy(createdCredentials.key, 'bootstrap')}
                    className="w-6 h-6 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer flex-shrink-0"
                  >
                    {copied === 'bootstrap' ? <Check className="w-2.5 h-2.5 text-[var(--color-success)]" /> : <Copy className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />}
                  </button>
                </div>
              </div>

              {/* One-click copy all integration info */}
              <div className="px-3 pt-2 pb-1.5">
                <button
                  onClick={() => {
                    const integrationInfo = `# Agent Integration Configuration
API Endpoint: ${window.location.origin}/api/v1
Bootstrap Key (临时): ${createdCredentials.key}

# ⚠️ 重要说明
此为 Bootstrap Key，仅用于首次 WebSocket 连接。
Bot 连接后需要用户批准，才能获得永久 Token (aim_ 前缀)。

# Environment Variables (.env)
IM_SERVER=${window.location.origin}
BOOTSTRAP_KEY=${createdCredentials.key}

# Integration Documentation
${createdCredentials.doc}`
                    handleCopy(integrationInfo, 'integration')
                  }}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-opacity shadow-sm"
                >
                  {copied === 'integration' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('invite.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t('bot.copyIntegration')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="px-3 pb-1">
                <button
                  onClick={downloadQuickstart}
                  className="w-full py-2 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors border border-[var(--color-border)]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Quickstart</span>
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{createdCredentials.doc}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Self-check and diagnostics */}
        {(selfCheck || diagnostics) && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span className="text-xs font-medium text-[var(--color-text-primary)]">Agent Self-check</span>
                <span className={cn(
                  'ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium',
                  selfCheck?.ready ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-amber-500/15 text-amber-500',
                )}>
                  {selfCheck?.ready ? 'READY' : 'ACTION NEEDED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md bg-[var(--color-bg-primary)] px-2 py-1.5">
                  <p className="text-[var(--color-text-muted)]">API Key</p>
                  <p className="text-[var(--color-text-secondary)]">{selfCheck?.has_api_key ? 'Configured' : 'Missing'}</p>
                </div>
                <div className="rounded-md bg-[var(--color-bg-primary)] px-2 py-1.5">
                  <p className="text-[var(--color-text-muted)]">Bootstrap</p>
                  <p className="text-[var(--color-text-secondary)]">{selfCheck?.has_bootstrap ? 'Present' : 'Revoked'}</p>
                </div>
                <div className="rounded-md bg-[var(--color-bg-primary)] px-2 py-1.5">
                  <p className="text-[var(--color-text-muted)]">Connections</p>
                  <p className="text-[var(--color-text-secondary)]">{diagnostics?.connections ?? 0}</p>
                </div>
                <div className="rounded-md bg-[var(--color-bg-primary)] px-2 py-1.5">
                  <p className="text-[var(--color-text-muted)]">Hub WS</p>
                  <p className="text-[var(--color-text-secondary)]">{diagnostics?.hub?.total_ws_connections ?? 0}</p>
                </div>
              </div>

              {(selfCheck?.recommendation || []).length > 0 && (
                <div className="rounded-md bg-amber-500/8 border border-amber-500/20 p-2">
                  {(selfCheck?.recommendation || []).map((item, i) => (
                    <p key={i} className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">• {item}</p>
                  ))}
                </div>
              )}
              {opError && (
                <div className="rounded-md bg-red-500/8 border border-red-500/20 p-2 text-[10px] text-red-400">
                  {opError}
                </div>
              )}
              {opInfo && (
                <div className="rounded-md bg-emerald-500/8 border border-emerald-500/20 p-2 text-[10px] text-emerald-400">
                  {opInfo}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(diagnosticsSnapshot, 'diag-snapshot')}
                  className="flex-1 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[10px] text-[var(--color-text-secondary)] cursor-pointer"
                >
                  {copied === 'diag-snapshot' ? t('common.copied') : t('bot.copyOpsSnapshot')}
                </button>
                <button
                  onClick={() => setConfirmRegenerate(true)}
                  disabled={rotatingToken || isDisabled}
                  className="flex-1 py-1.5 rounded-md bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 text-[10px] text-[var(--color-accent)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {rotatingToken ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                  {t('bot.regenerateToken')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending connection card (has bootstrap key but not just created) */}
        {showPendingCreds && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">{t('bot.pendingConnection')}</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                {t('bot.pendingConnectionDesc')}
              </p>
              {credStatus?.bootstrap_prefix && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase">{t('bot.keyPrefix')}</span>
                  <code className="text-[10px] font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2 py-0.5 rounded">
                    {credStatus.bootstrap_prefix}****
                  </code>
                </div>
              )}
              <p className="text-[9px] text-[var(--color-text-muted)] italic">{t('bot.keyLostHint')}</p>
            </div>
          </div>
        )}

        {/* Agent access pack */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span className="text-xs font-medium text-[var(--color-text-primary)]">{t('bot.agentAccessPack')}</span>
              {!accessToken && (
                <span className="ml-auto text-[10px] text-amber-500">{t('bot.regenerateToGetToken')}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(accessText, 'agent-access-text')}
                disabled={!accessToken}
                className="flex-1 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[10px] text-[var(--color-text-secondary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied === 'agent-access-text' ? t('common.copied') : t('bot.copyAgentAccess')}
              </button>
              <button
                onClick={() => handleCopy(accessUrl, 'agent-access-url')}
                disabled={!accessToken}
                className="flex-1 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[10px] text-[var(--color-text-secondary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Link className="w-3 h-3" />
                {copied === 'agent-access-url' ? t('common.copied') : t('bot.copyAgentUrl')}
              </button>
            </div>
            <button
              onClick={downloadQuickstart}
              disabled={!accessToken}
              className="w-full py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[10px] text-[var(--color-text-secondary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              {t('bot.downloadQuickstart')}
            </button>
          </div>
        </div>

        {/* Agent info card */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          {/* Avatar change */}
          {!isDisabled && (
            <div className="flex items-center gap-3 mb-3">
              <AvatarPicker
                currentUrl={bot.avatar_url}
                onSelect={async (url) => {
                  await api.updateEntity(token, bot.id, { avatar_url: url })
                  onRefresh?.()
                }}
                size="sm"
              />
              <span className="text-[10px] text-[var(--color-text-muted)]">{t('bot.changeAvatar')}</span>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
            </div>
          )}

          {/* Info rows — vertical list (名片 style) */}
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <User className="w-3 h-3" />
                {t('bot.owner')}
              </span>
              <div className="flex items-center gap-1.5">
                {ownerEntity ? (
                  <>
                    <EntityAvatar entity={ownerEntity} size="xs" />
                    <span className="text-[11px] text-[var(--color-text-primary)]">{entityDisplayName(ownerEntity)}</span>
                  </>
                ) : (
                  <span className="text-[11px] text-[var(--color-text-muted)]">#{bot.owner_id || '—'}</span>
                )}
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                {t('bot.type')}
              </span>
              <span className="text-[11px] text-[var(--color-text-primary)] capitalize">{bot.entity_type}</span>
            </div>

            {/* ID */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <Hash className="w-3 h-3" />
                ID
              </span>
              <span className="text-[11px] text-[var(--color-text-primary)] font-mono">{bot.id}</span>
            </div>

            {/* Created */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {t('bot.createdAt')}
              </span>
              <span className="text-[11px] text-[var(--color-text-primary)]">
                {bot.created_at ? new Date(bot.created_at).toLocaleDateString() : '—'}
              </span>
            </div>

            {/* Last seen */}
            {lastSeen && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {t('bot.lastSeen')}
                </span>
                <span className="text-[11px] text-[var(--color-text-primary)]">
                  {new Date(lastSeen).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {tags.map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-md bg-[var(--color-bot)]/10 text-[var(--color-bot)] text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Capabilities */}
          {caps.length > 0 && (
            <div className="flex items-start gap-2 mt-2.5">
              <FileText className="w-3.5 h-3.5 text-[var(--color-bot)] mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {caps.map((cap, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px]">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons — varies by status */}
          <div className="flex gap-2 mt-3">
            {isDisabled ? (
              <>
                {/* Disabled state: re-enable only */}
                <button
                  onClick={() => onReactivate(bot.id)}
                  className="py-1.5 px-3 rounded-lg bg-[var(--color-success)]/15 hover:bg-[var(--color-success)]/25 text-[var(--color-success)] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('bot.reactivate')}
                </button>
              </>
            ) : (
              <>
                {/* Active state: start chat + disable */}
                <button
                  onClick={() => onStartChat(bot.id)}
                  className="py-1.5 px-3 rounded-lg bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  {t('conversation.newChat')}
                </button>
                <button
                  onClick={() => setConfirmDisable(true)}
                  className="py-1.5 px-2 rounded-lg hover:bg-amber-500/15 text-[var(--color-text-muted)] hover:text-amber-500 text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
                >
                  <PowerOff className="w-3 h-3" />
                  {t('bot.disableAgent')}
                </button>
              </>
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
              {t('conversation.direct')}
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
              {t('conversation.group')}
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
                      {conv.title || t('conversation.unnamed')}
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
                  {t('bot.noConversations')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDisable}
        title={t('bot.disableAgent')}
        message={t('bot.disableConfirm', { name: entityDisplayName(bot) })}
        confirmLabel={t('bot.disableAgent')}
        onConfirm={() => { setConfirmDisable(false); onDisable(bot.id) }}
        onCancel={() => setConfirmDisable(false)}
      />
      <ConfirmDialog
        open={confirmRegenerate}
        title={t('bot.regenerateToken')}
        message={t('bot.regenerateConfirm')}
        confirmLabel={t('bot.regenerateToken')}
        onConfirm={() => { setConfirmRegenerate(false); handleRegenerateToken() }}
        onCancel={() => setConfirmRegenerate(false)}
      />
    </div>
  )
}
