import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { BotList } from '@/components/entity/BotList'
import { BotDetail } from '@/components/entity/BotDetail'
import { NewConversationDialog } from '@/components/conversation/NewConversationDialog'
import { NewConversationSheet } from '@/components/conversation/NewConversationSheet'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import type { AppOutletContext } from '@/layouts/AppLayout'
import { useConversationsStore } from '@/store/conversations'

export function BotsPage() {
  const { botId, botIdentifier } = useParams()
  const navigate = useNavigate()
  const { convManager, botManager, isMobile } = useOutletContext<AppOutletContext>()
  const {
    botEntities,
    createdCredentials,
    botListRefresh,
    loadBotEntities,
    setCreatedCredentials,
    handleDisableBot,
    handleReactivateBot,
    handleHardDeleteBot: hardDeleteBot,
  } = botManager

  const selectedBotId = botId ? Number(botId) : null
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()
  const getConversations = useConversationsStore((s) => s.conversations)

  const botRouteFor = useCallback((bot: { id: number; bot_id?: string; public_id?: string } | null | undefined) => {
    if (!bot) return '/bots'
    const identifier = bot.bot_id || bot.public_id
    return identifier ? `/bots/public/${encodeURIComponent(identifier)}` : `/bots/${bot.id}`
  }, [])

  const conversationRouteFor = useCallback((conversation: { id: number; public_id?: string; metadata?: Record<string, unknown> } | null | undefined) => {
    if (!conversation) return '/chat'
    const meta = conversation.metadata as Record<string, unknown> | undefined
    const publicId = conversation.public_id || (typeof meta?.public_id === 'string' ? meta.public_id : '')
    return publicId ? `/chat/${encodeURIComponent(publicId)}` : `/chat/${conversation.id}`
  }, [])

  // Load bot entities when entering bots view
  useEffect(() => {
    loadBotEntities()
  }, [loadBotEntities])

  // Also reload when navigating to a specific bot
  useEffect(() => {
    if (selectedBotId || botIdentifier) loadBotEntities()
  }, [selectedBotId, botIdentifier, loadBotEntities])

  const selectedBot = botIdentifier
    ? (botEntities.find((e) => e.bot_id === botIdentifier || e.public_id === botIdentifier) || null)
    : (botEntities.find((e) => e.id === selectedBotId) || null)

  const handleSelectBot = useCallback((id: number | null) => {
    if (id !== null) {
      const bot = botEntities.find((item) => item.id === id)
      navigate(botRouteFor(bot || { id }))
      loadBotEntities()
    } else {
      navigate('/bots')
    }
  }, [botEntities, botRouteFor, navigate, loadBotEntities])

  const handleStartChatFromBot = useCallback((entityId: number) => {
    setNewChatEntityId(entityId)
    setShowNewChat(true)
  }, [])

  const handleOpenConversation = useCallback((conv: { id: number; public_id?: string; metadata?: Record<string, unknown> }) => {
    navigate(conversationRouteFor(conv))
  }, [conversationRouteFor, navigate])

  const handleBotDetailBack = useCallback(() => {
    navigate('/bots')
  }, [navigate])

  const handleHardDeleteBot = useCallback(async (botIdToDelete: number) => {
    await hardDeleteBot(botIdToDelete)
    navigate('/bots')
  }, [hardDeleteBot, navigate])

  return (
    <div className="h-full flex min-h-0">
      {/* Left panel: BotList */}
      <div className={cn(
        'border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-0 overflow-hidden',
        isMobile ? 'w-full h-full' : 'w-72',
        isMobile
          ? (selectedBot ? 'hidden' : 'flex flex-col')
          : (selectedBot ? 'hidden md:flex md:flex-col' : 'flex flex-col'),
      )}>
        <BotList
          selectedId={selectedBotId}
          onSelect={(id) => handleSelectBot(id)}
          onStartChat={handleStartChatFromBot}
          onCreated={(result) => {
            setCreatedCredentials(result)
            navigate(botRouteFor(result.entity))
            loadBotEntities()
          }}
          refreshTrigger={botListRefresh}
        />
      </div>

      {/* Right panel: BotDetail */}
      <div className={cn(
        'flex-1 min-w-0 flex',
        isMobile && selectedBot && 'mobile-chat-panel',
      )}>
        {(selectedBot || !isMobile) ? (
          <div className="flex-1 min-w-0" style={{ animation: 'fade-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
            <ErrorBoundary>
              <BotDetail
                bot={selectedBot}
                createdCredentials={selectedBot?.id === createdCredentials?.entity.id ? createdCredentials : null}
                onDismissCredentials={() => setCreatedCredentials(null)}
                onBack={handleBotDetailBack}
                onOpenConversation={handleOpenConversation}
                onDisable={handleDisableBot}
                onReactivate={handleReactivateBot}
                onHardDelete={handleHardDeleteBot}
                onStartChat={handleStartChatFromBot}
                onRefresh={loadBotEntities}
              />
            </ErrorBoundary>
          </div>
        ) : null}
      </div>

      {/* New chat modal (triggered from bot panel "Start Chat") */}
      {isMobile ? (
        <NewConversationSheet
          open={showNewChat}
          preselectedEntityId={newChatEntityId}
          onClose={() => setShowNewChat(false)}
          onCreated={(convId) => {
            setShowNewChat(false)
            convManager.loadConversations().then(() => {
              const conversation = useConversationsStore.getState().conversations.find((item) => item.id === convId) || getConversations.find((item) => item.id === convId)
              navigate(conversationRouteFor(conversation || { id: convId }))
            })
          }}
        />
      ) : (
        showNewChat && (
          <NewConversationDialog
            preselectedEntityId={newChatEntityId}
            onClose={() => setShowNewChat(false)}
            onCreated={(convId) => {
              setShowNewChat(false)
              convManager.loadConversations().then(() => {
                const conversation = useConversationsStore.getState().conversations.find((item) => item.id === convId) || getConversations.find((item) => item.id === convId)
                navigate(conversationRouteFor(conversation || { id: convId }))
              })
            }}
          />
        )
      )}
    </div>
  )
}
