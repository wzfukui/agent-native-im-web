import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import type { Entity, Conversation } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { AvatarPicker } from './AvatarPicker'
import { entityDisplayName, cn } from '@/lib/utils'
import { getEntityPresenceSemantic, getEntityStatusLabel } from '@/lib/entity-status'
import { getGatewayUrl, getGatewayWebSocketUrl } from '@/lib/gateway'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { generateBotQuickstart } from '@/lib/bot-quickstart'
import {
  ArrowLeft, Wifi, WifiOff, Sparkles, User,
  MessageSquare, Users, ChevronRight, ChevronDown, ChevronUp, Loader2,
  Hash, Calendar, Tag, Key, Copy, Check, Clock,
  PowerOff, RotateCcw, Download, Activity, RefreshCw, Link, ExternalLink,
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

export function BotDetail({ bot, createdCredentials, onDismissCredentials, onBack, onOpenConversation, onDisable, onReactivate, onStartChat, onRefresh }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const online = usePresenceStore((s) => s.online)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct')
  const [confirmDisable, setConfirmDisable] = useState(false)
  // credStatus removed — selfCheck provides the same info
  const [selfCheck, setSelfCheck] = useState<{ ready: boolean; recommendation: string[]; has_api_key: boolean; has_bootstrap: boolean } | null>(null)
  const [diagnostics, setDiagnostics] = useState<{ online: boolean; connections: number; disconnect_count: number; forced_disconnect_count?: number; last_seen?: string; hub: { total_ws_connections: number } } | null>(null)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | false>(false)
  const [docExpanded, setDocExpanded] = useState(false)
  const [convsCollapsed, setConvsCollapsed] = useState(false)
  const [rotatingToken, setRotatingToken] = useState(false)
  const [rotatedToken, setRotatedToken] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)
  const [opInfo, setOpInfo] = useState<string | null>(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  // Load conversations + reset UI state when bot changes
  useEffect(() => {
    if (!bot) return
    let cancelled = false

    // Schedule resets in microtask to avoid synchronous setState in effect body
    queueMicrotask(() => {
      if (cancelled) return
      setLoadingConvs(true)
      setActiveTab('direct')
      setConfirmDisable(false)
      setDocExpanded(false)
      setRotatingToken(false)
      setRotatedToken(null)
      setOpError(null)
      setOpInfo(null)
      setSelfCheck(null)
      setDiagnostics(null)
      setLastSeen(null)
    })

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
  }, [bot, token])

  const isOwner = !!(bot && myEntity && bot.owner_id === myEntity.id)

  // Load credential status + entity status (owner-only APIs)
  useEffect(() => {
    if (!bot) return
    let cancelled = false

    if (isOwner) {
      api.getEntitySelfCheck(token, bot.id).then((res) => {
        if (!cancelled && res.ok && res.data) setSelfCheck(res.data)
      }).catch(() => {})
      api.getEntityDiagnostics(token, bot.id).then((res) => {
        if (!cancelled && res.ok && res.data) setDiagnostics(res.data)
      }).catch(() => {})
    }

    api.getEntityStatus(token, bot.id).then((res) => {
      if (!cancelled && res.ok && res.data?.last_seen) setLastSeen(res.data.last_seen)
    }).catch(() => {})

    return () => { cancelled = true }
  }, [bot, token, isOwner])

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
      apiUrl: `${gatewayUrl}/api/v1`,
      webUrl: gatewayUrl,
    })
    const blob = new Blob([quickstart], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bot.name || 'bot'}-quickstart.md`
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

  // Empty state — minimal, no gradient icon
  if (!bot) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">{t('bot.agentDetails')}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{t('bot.selectAgent')}</p>
      </div>
    )
  }

  const isOnline = online.has(bot.id)
  const isDisabled = bot.status === 'disabled'
  const statusSemantic = getEntityPresenceSemantic(bot, isOnline)
  const statusLabel = getEntityStatusLabel(t, bot, isOnline)
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
  const accessToken = rotatedToken || (showFullCreds ? createdCredentials?.key : null)
  const gatewayUrl = getGatewayUrl()
  const wsUrl = getGatewayWebSocketUrl()
  const accessText = accessToken ? [
    `AGENT_IM_BASE=${gatewayUrl}/api/v1`,
    `AGENT_IM_TOKEN=${accessToken}`,
    `AGENT_IM_WS=${wsUrl}`,
    '',
    '# Quick check',
    `curl ${gatewayUrl}/api/v1/me -H "Authorization: Bearer ${accessToken}"`,
    '',
    '# WebSocket clients should send Authorization: Bearer <token> during the handshake',
  ].join('\n') : ''
  const accessUrl = accessToken
    ? `aim-bot://connect?base=${encodeURIComponent(`${gatewayUrl}/api/v1`)}&token=${encodeURIComponent(accessToken)}&entity_id=${bot.id}`
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

  // --- Shared button style helper ---
  const secondaryBtn = 'py-1.5 px-3 rounded-lg text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer flex items-center gap-1.5'
  const copyBtn = (label: string) => copied === label
    ? <Check className="w-3 h-3 text-[var(--color-success)]" />
    : <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <EntityAvatar entity={bot} size="md" showStatus />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate tracking-[-0.01em]">
            {entityDisplayName(bot)}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">@{bot.name}</p>
        </div>

        {/* Status + primary action in header */}
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5',
          statusSemantic === 'disabled' || statusSemantic === 'pending'
            ? 'bg-[var(--color-warning)]/12 text-[var(--color-warning)]'
            : statusSemantic === 'online'
              ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]'
              : 'bg-[var(--color-text-muted)]/12 text-[var(--color-text-muted)]'
        )}>
          {statusSemantic === 'disabled' ? (
            <><PowerOff className="w-3 h-3" /> {statusLabel}</>
          ) : statusSemantic === 'pending' ? (
            <><Clock className="w-3 h-3" /> {statusLabel}</>
          ) : statusSemantic === 'online' ? (
            <><Wifi className="w-3 h-3" /> {statusLabel}</>
          ) : (
            <><WifiOff className="w-3 h-3" /> {statusLabel}</>
          )}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Credential banner (just created, owner only) ── */}
        {isOwner && showFullCreds && createdCredentials && (
          <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-warning)]/4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--color-warning)]" />
                <span className="text-xs font-semibold text-[var(--color-warning)]">
                  {t('bot.apiKey')} — {t('bot.saveKeyWarning')}
                </span>
              </div>
              <button
                onClick={onDismissCredentials}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
              >
                {t('common.dismiss')}
              </button>
            </div>

            {/* Connection fields — flat, no nested cards */}
            <div className="space-y-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)] w-8 flex-shrink-0">API</span>
                <code className="flex-1 text-xs font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 rounded-lg truncate">
                  {gatewayUrl}/api/v1
                </code>
                <button onClick={() => handleCopy(`${gatewayUrl}/api/v1`, 'api')} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] cursor-pointer">
                  {copyBtn('api')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-warning)] w-8 flex-shrink-0">Key</span>
                <button
                  onClick={() => handleCopy(createdCredentials.key, 'bootstrap')}
                  className="flex-1 text-left group cursor-pointer"
                  title={t('common.copied')}
                >
                  <code className="block text-xs font-mono text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 rounded-lg truncate group-hover:bg-[var(--color-bg-hover)] transition-colors">
                    {copied === 'bootstrap'
                      ? createdCredentials.key
                      : `${createdCredentials.key.slice(0, 8)}${'*'.repeat(24)}${createdCredentials.key.slice(-4)}`
                    }
                  </code>
                </button>
                <span className="p-1.5 flex-shrink-0">
                  {copyBtn('bootstrap')}
                </span>
              </div>
            </div>

            {/* Actions — horizontal, no gradient */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const integrationInfo = `# Bot Integration Configuration
API Endpoint: ${gatewayUrl}/api/v1
API Key: ${createdCredentials.key}

# Environment Variables (.env)
AGENT_IM_BASE=${gatewayUrl}/api/v1
AGENT_IM_TOKEN=${createdCredentials.key}

# Integration Documentation
${createdCredentials.doc}`
                  handleCopy(integrationInfo, 'integration')
                }}
                className="flex-1 py-2 rounded-lg bg-[var(--color-warning)]/12 hover:bg-[var(--color-warning)]/18 text-[var(--color-warning)] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {copied === 'integration' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'integration' ? t('invite.copied') : t('bot.copyIntegration')}
              </button>
              <button
                onClick={downloadQuickstart}
                className="py-2 px-3 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-xs text-[var(--color-text-secondary)] cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t('bot.downloadQuickstart')}
              </button>
            </div>

            {/* Collapsible doc */}
            <button
              onClick={() => setDocExpanded(!docExpanded)}
              className="mt-2 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
            >
              {docExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {docExpanded ? t('bot.collapseDoc') : t('bot.expandDoc')}
            </button>
            {docExpanded && (
              <div className="mt-2 p-3 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] max-h-48 overflow-y-auto text-xs md max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{createdCredentials.doc}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* ── Status overview — flat key-value, owner only ── */}
        {isOwner && (selfCheck || diagnostics) && (
          <div className="px-5 py-5 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('bot.statusSection')}</span>
              </div>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                selfCheck?.ready ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/12 text-[var(--color-warning)]',
              )}>
                {selfCheck?.ready ? t('bot.statusReady') : t('bot.statusActionNeeded')}
              </span>
            </div>

            {/* Flat metrics row */}
            <div className="flex gap-6 text-xs mb-3">
              <div>
                <p className="text-[var(--color-text-muted)]">{t('bot.apiKey')}</p>
                <p className="text-[var(--color-text-primary)] font-medium">{selfCheck?.has_api_key ? t('bot.apiKeyConfigured') : t('bot.apiKeyMissing')}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)]">{t('bot.connections')}</p>
                <p className="text-[var(--color-text-primary)] font-medium">{diagnostics?.connections ?? 0}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)]">{t('bot.hubWs')}</p>
                <p className="text-[var(--color-text-primary)] font-medium">{diagnostics?.hub?.total_ws_connections ?? 0}</p>
              </div>
            </div>

            {(selfCheck?.recommendation || []).length > 0 && (
              <div className="rounded-lg bg-[var(--color-warning)]/6 border border-[var(--color-warning)]/15 p-2.5 mb-3">
                {(selfCheck?.recommendation || []).map((item, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-secondary)] leading-relaxed">• {translateRecommendation(item, t)}</p>
                ))}
              </div>
            )}
            {opError && (
              <div className="rounded-lg bg-[var(--color-error)]/6 border border-[var(--color-error)]/15 p-2.5 mb-3 text-xs text-[var(--color-error)]">
                {opError}
              </div>
            )}
            {opInfo && (
              <div className="rounded-lg bg-[var(--color-success)]/6 border border-[var(--color-success)]/15 p-2.5 mb-3 text-xs text-[var(--color-success)]">
                {opInfo}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(diagnosticsSnapshot, 'diag-snapshot')}
                className={secondaryBtn}
              >
                {copyBtn('diag-snapshot')}
                {copied === 'diag-snapshot' ? t('common.copied') : t('bot.copyOpsSnapshot')}
              </button>
              <button
                onClick={() => setConfirmRegenerate(true)}
                disabled={rotatingToken || isDisabled}
                className="py-1.5 px-3 rounded-lg text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {rotatingToken ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                {t('bot.regenerateToken')}
              </button>
            </div>
          </div>
        )}

        {/* ── Access pack — consolidated (owner only) ── */}
        {isOwner && (accessToken || !showFullCreds) && (
          <div className="px-5 py-5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('bot.agentAccessPack')}</span>
              {!accessToken && (
                <span className="ml-auto text-xs text-[var(--color-warning)]">{t('bot.regenerateToGetToken')}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCopy(accessText, 'bot-access-text')}
                disabled={!accessToken}
                className={cn(secondaryBtn, 'border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                {copyBtn('bot-access-text')}
                {copied === 'bot-access-text' ? t('common.copied') : t('bot.copyBotAccess')}
              </button>
              <button
                onClick={() => handleCopy(accessUrl, 'bot-access-url')}
                disabled={!accessToken}
                className={cn(secondaryBtn, 'border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <Link className="w-3 h-3 text-[var(--color-text-muted)]" />
                {copied === 'bot-access-url' ? t('common.copied') : t('bot.copyBotUrl')}
              </button>
              <button
                onClick={downloadQuickstart}
                disabled={!accessToken}
                className={cn(secondaryBtn, 'border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <Download className="w-3 h-3 text-[var(--color-text-muted)]" />
                {t('bot.downloadQuickstart')}
              </button>
              <a
                href={`${gatewayUrl}/api/v1/onboarding-guide`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(secondaryBtn, 'border border-[var(--color-border)] no-underline')}
              >
                <ExternalLink className="w-3 h-3 text-[var(--color-text-muted)]" />
                {t('bot.onboardingGuide')}
              </a>
            </div>
          </div>
        )}

        {/* ── Bot info — no card wrapper ── */}
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          {/* Avatar change (owner only) */}
          {isOwner && !isDisabled && (
            <div className="flex items-center gap-3 mb-4">
              <AvatarPicker
                currentUrl={bot.avatar_url}
                onSelect={async (url) => {
                  await api.updateEntity(token, bot.id, { avatar_url: url })
                  onRefresh?.()
                }}
                size="sm"
              />
              <span className="text-xs text-[var(--color-text-muted)]">{t('bot.changeAvatar')}</span>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="flex items-start gap-2.5 mb-4">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
            </div>
          )}

          {/* Info rows — clean key-value */}
          <div className="space-y-2.5">
            <InfoRow icon={User} label={t('bot.owner')}>
              {ownerEntity ? (
                <span className="flex items-center gap-1.5">
                  <EntityAvatar entity={ownerEntity} size="xs" />
                  <span className="text-xs text-[var(--color-text-primary)]">{entityDisplayName(ownerEntity)}</span>
                </span>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">#{bot.owner_id || '—'}</span>
              )}
            </InfoRow>
            <InfoRow icon={Tag} label={t('bot.type')}>
              <span className="text-xs text-[var(--color-text-primary)] capitalize">{bot.entity_type}</span>
            </InfoRow>
            <InfoRow icon={Hash} label="ID">
              <span className="text-xs text-[var(--color-text-primary)] font-mono">{bot.id}</span>
            </InfoRow>
            <InfoRow icon={Calendar} label={t('bot.createdAt')}>
              <span className="text-xs text-[var(--color-text-primary)]">
                {bot.created_at ? new Date(bot.created_at).toLocaleDateString() : '—'}
              </span>
            </InfoRow>
            {lastSeen && (
              <InfoRow icon={Clock} label={t('bot.lastSeen')}>
                <span className="text-xs text-[var(--color-text-primary)]">
                  {new Date(lastSeen).toLocaleString()}
                </span>
              </InfoRow>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('bot.capabilityTitle')}</p>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {t('bot.capabilitySummary')}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                t('bot.capabilityText'),
                t('bot.capabilityImages'),
                t('bot.capabilityAudio'),
                t('bot.capabilityVideo'),
                t('bot.capabilityPdf'),
              ].map((label) => (
                <span key={label} className="px-2 py-0.5 rounded-full bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] text-xs border border-[var(--color-border)]">
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
              {t('bot.capabilityBoundary')}
            </p>
          </div>

          {/* Tags + Capabilities — inline */}
          {(tags.length > 0 || caps.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {tags.map((tag, i) => (
                <span key={`t${i}`} className="px-2 py-0.5 rounded-full bg-[var(--color-bot)]/10 text-[var(--color-bot)] text-xs">
                  {tag}
                </span>
              ))}
              {caps.map((cap, i) => (
                <span key={`c${i}`} className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs">
                  {cap}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {isOwner && isDisabled ? (
              <button
                onClick={() => onReactivate(bot.id)}
                className="py-2 px-4 rounded-lg bg-[var(--color-success)]/12 hover:bg-[var(--color-success)]/18 text-[var(--color-success)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('bot.reactivate')}
              </button>
            ) : (
              <>
                {!isDisabled && (
                  <button
                    onClick={() => onStartChat(bot.id)}
                    className="py-2 px-4 rounded-lg bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/18 text-[var(--color-accent)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t('conversation.newChat')}
                  </button>
                )}
                {isOwner && !isDisabled && (
                  <button
                    onClick={() => setConfirmDisable(true)}
                    className="py-2 px-3 rounded-lg hover:bg-[var(--color-warning)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-warning)] text-xs flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    {t('bot.disableAgent')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Conversations ── */}
        <div className="px-5 py-5">
          <button
            onClick={() => setConvsCollapsed(!convsCollapsed)}
            className="flex items-center gap-2 mb-3 cursor-pointer group w-full"
          >
            {convsCollapsed ? <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('bot.conversations')}</span>
            <span className="text-xs text-[var(--color-text-muted)]">({conversations.length})</span>
          </button>
          {!convsCollapsed && <>
          <div className="flex items-center gap-1 mb-3 bg-[var(--color-bg-secondary)] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('direct')}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                activeTab === 'direct'
                  ? 'bg-[var(--color-bg-primary)] shadow-sm text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t('conversation.direct')}
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-xs">
                {directConvs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                activeTab === 'groups'
                  ? 'bg-[var(--color-bg-primary)] shadow-sm text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              {t('conversation.group')}
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-xs">
                {groupConvs.length}
              </span>
            </button>
          </div>

          {loadingConvs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {tabConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onOpenConversation(conv.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-left group cursor-pointer"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    conv.conv_type === 'direct' ? 'bg-[var(--color-accent)]/8' : 'bg-[var(--color-bot)]/8'
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
                    <p className="text-xs text-[var(--color-text-muted)]">
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
          </>}
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

/** Map backend recommendation strings to i18n keys */
const REC_MAP: Record<string, string> = {
  'entity is disabled, reactivate it first': 'bot.recDisabled',
  'bot is still using bootstrap key, complete approval to issue permanent key': 'bot.recBootstrapOnly',
  'no credentials found, recreate or re-approve this bot': 'bot.recNoCreds',
  'bot is offline, verify network and websocket handshake': 'bot.recOffline',
}
function translateRecommendation(text: string, t: (key: string) => string): string {
  const key = REC_MAP[text]
  return key ? t(key) : text
}

/** Reusable info row — icon + label + value, compact gap */
function InfoRow({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 w-24 flex-shrink-0">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      {children}
    </div>
  )
}
