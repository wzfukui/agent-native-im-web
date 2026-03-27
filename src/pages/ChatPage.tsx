import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { ConversationList } from '@/components/conversation/ConversationList'
import { ChatThread } from '@/components/chat/ChatThread'
import { ConversationSettingsPanel } from '@/components/conversation/ConversationSettingsPanel'
import { TaskPanel } from '@/components/task/TaskPanel'
import { NewConversationDialog } from '@/components/conversation/NewConversationDialog'
import { NewConversationSheet } from '@/components/conversation/NewConversationSheet'
import { GlobalSearch } from '@/components/conversation/GlobalSearch'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OnboardingCard } from '@/components/ui/OnboardingCard'
import { cn } from '@/lib/utils'
import { needsFirstBot } from '@/lib/first-login'
import { MessageSquare, Bot, Settings2 } from 'lucide-react'
import type { Entity } from '@/lib/types'
import type { AppOutletContext } from '@/layouts/AppLayout'

export function ChatPage() {
  const { t } = useTranslation()
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { ws, convManager, botManager, isMobile } = useOutletContext<AppOutletContext>()
  const { loadBotEntities, botEntities } = botManager
  const entity = useAuthStore((s) => s.entity)
  const { conversations, activeId, removeConversation, updateConversation } = useConversationsStore()
  const setActive = useConversationsStore((s) => s.setActive)

  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()
  const [showSettings, setShowSettings] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

  // Sync URL param to store
  useEffect(() => {
    const urlId = conversationId ? Number(conversationId) : null
    if (urlId !== activeId) {
      setActive(urlId)
    }
  }, [conversationId, activeId, setActive])

  useEffect(() => {
    if (conversations.length === 0 && botEntities.length === 0) {
      loadBotEntities()
    }
  }, [conversations.length, botEntities.length, loadBotEntities])

  const handleSelectConversation = useCallback((id: number | null) => {
    if (id !== null) {
      navigate(`/chat/${id}`)
    } else {
      navigate('/chat')
    }
  }, [navigate])

  const handleBackFromChat = useCallback(() => {
    navigate('/chat')
  }, [navigate])

  const handleEntitySendMessage = useCallback((target: Entity) => {
    navigate('/chat')
    setNewChatEntityId(target.id)
    setShowNewChat(true)
  }, [navigate])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGlobalSearchResult = useCallback((conversationId: number, _messageId: number) => {
    setShowGlobalSearch(false)
    navigate(`/chat/${conversationId}`)
  }, [navigate])

  const handleEntityViewDetails = useCallback((target: Entity) => {
    if (target.entity_type === 'bot' || target.entity_type === 'service') {
      navigate(`/bots/${target.id}`)
      loadBotEntities()
    }
  }, [navigate, loadBotEntities])

  const { activeConv, isArchivedView } = convManager
  const hasConversation = !!activeConv
  const hasBots = botEntities.some((entity) => entity.entity_type !== 'user' && entity.status !== 'disabled')
  const shouldCreateFirstBot = needsFirstBot(hasBots)

  return (
    <div className="h-full flex min-h-0">
      {/* Left panel: ConversationList */}
      <div className={cn(
        'border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-0 overflow-hidden',
        isMobile ? 'w-full h-full' : 'w-72',
        isMobile
          ? (conversationId ? 'hidden' : 'flex flex-col')
          : (activeId ? 'hidden md:flex md:flex-col' : 'flex flex-col'),
      )}>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          myEntityId={entity?.id || 0}
          onSelect={handleSelectConversation}
          onNewChat={() => { setNewChatEntityId(undefined); setShowNewChat(true) }}
          onGlobalSearch={() => setShowGlobalSearch(true)}
          onUpdateConversation={(id, title) => {
            updateConversation(id, { title })
          }}
          onLeave={convManager.handleLeaveConversation}
          onArchive={convManager.handleArchiveConversation}
          onUnarchive={convManager.handleUnarchiveConversation}
          onPin={convManager.handlePinConversation}
          onUnpin={convManager.handleUnpinConversation}
          onRefresh={convManager.loadConversations}
          archiveRefresh={convManager.archiveRefresh}
          loading={convManager.convsLoading}
          showCachedSnapshot={convManager.showCachedSnapshot}
        />
      </div>

      {/* Right panel: ChatThread */}
      <div className={cn(
        'flex-1 min-w-0 flex',
        isMobile && conversationId && 'mobile-chat-panel',
      )}>
        {hasConversation ? (
          <>
            <div className="flex-1 min-w-0" style={{ animation: 'fade-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
              <ErrorBoundary>
                <ChatThread
                  key={activeConv!.id}
                  conversation={activeConv!}
                  onBack={handleBackFromChat}
                  onCancelStream={ws.sendCancelStream}
                  onTyping={ws.sendTyping}
                  typingEntities={ws.typingMap.get(activeConv!.id)}
                  onToggleSettings={() => { setShowSettings((prev) => !prev); setShowTasks(false) }}
                  onToggleTasks={() => { setShowTasks((prev) => !prev); setShowSettings(false) }}
                  onEntitySendMessage={handleEntitySendMessage}
                  onEntityViewDetails={handleEntityViewDetails}
                  isArchived={isArchivedView}
                />
              </ErrorBoundary>
            </div>
            {showSettings && (
              <ConversationSettingsPanel
                conversation={activeConv!}
                onClose={() => setShowSettings(false)}
                onLeave={() => removeConversation(activeConv!.id)}
                isArchived={isArchivedView}
              />
            )}
            {showTasks && (
              <TaskPanel
                conversationId={activeConv!.id}
                participants={(activeConv!.participants || []).map((p: { entity_id: number; entity?: Entity }) => ({
                  entity_id: p.entity_id,
                  entity: p.entity as { id: number; display_name: string; name: string; entity_type: string } | undefined,
                }))}
                onClose={() => setShowTasks(false)}
                isArchived={isArchivedView}
              />
            )}
          </>
        ) : (
          /* Empty state - only shown on desktop */
          !isMobile && (
            <div className="flex-1 h-full flex flex-col items-center justify-center" style={{ animation: 'fade-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
              <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] mb-1.5">
                {conversations.length === 0 ? t('app.welcomeTitle') : 'Agent-Native IM'}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-8">
                {conversations.length === 0 ? t('auth.tagline') : ''}
              </p>
              {conversations.length === 0 && (
                <div className="w-full max-w-xl px-6 mb-8">
                  <OnboardingCard
                    onNewChat={shouldCreateFirstBot ? undefined : () => { setNewChatEntityId(undefined); setShowNewChat(true) }}
                    onManageBots={() => navigate('/bots')}
                    primaryLabel={shouldCreateFirstBot ? t('onboarding.createBotAction') : undefined}
                    secondaryLabel={shouldCreateFirstBot ? t('onboarding.reviewBotsAction') : undefined}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 w-56">
                {!shouldCreateFirstBot ? (
                  <button
                    onClick={() => { setNewChatEntityId(undefined); setShowNewChat(true) }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group text-left"
                  >
                    <MessageSquare className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
                    <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{t('app.welcomeStep2Action')}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/bots')}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group text-left"
                  >
                    <Bot className="w-4 h-4 text-[var(--color-bot)] flex-shrink-0" />
                    <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{t('onboarding.createBotAction')}</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/bots')}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group text-left"
                >
                  <Bot className="w-4 h-4 text-[var(--color-bot)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{t('app.welcomeStep1Action')}</span>
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer group text-left"
                >
                  <Settings2 className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{t('settings.title')}</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Global Search */}
      {showGlobalSearch && (
        <GlobalSearch
          onSelectResult={handleGlobalSearchResult}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {/* Modals */}
      {isMobile ? (
        <NewConversationSheet
          open={showNewChat}
          preselectedEntityId={newChatEntityId}
          onClose={() => setShowNewChat(false)}
          onCreated={(convId) => {
            setShowNewChat(false)
            convManager.loadConversations().then(() => handleSelectConversation(convId))
          }}
        />
      ) : (
        showNewChat && (
          <NewConversationDialog
            preselectedEntityId={newChatEntityId}
            onClose={() => setShowNewChat(false)}
            onCreated={(convId) => {
              setShowNewChat(false)
              convManager.loadConversations().then(() => handleSelectConversation(convId))
            }}
          />
        )
      )}
    </div>
  )
}
