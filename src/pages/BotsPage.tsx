import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { BotList } from '@/components/entity/BotList'
import { BotDetail } from '@/components/entity/BotDetail'
import { NewConversationDialog } from '@/components/conversation/NewConversationDialog'
import { NewConversationSheet } from '@/components/conversation/NewConversationSheet'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import type { AppOutletContext } from '@/layouts/AppLayout'

export function BotsPage() {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { convManager, botManager, isMobile } = useOutletContext<AppOutletContext>()

  const selectedBotId = botId ? Number(botId) : null
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEntityId, setNewChatEntityId] = useState<number | undefined>()

  // Load bot entities when entering bots view
  useEffect(() => {
    botManager.loadBotEntities()
  }, [botManager])

  // Also reload when navigating to a specific bot
  useEffect(() => {
    if (selectedBotId) botManager.loadBotEntities()
  }, [selectedBotId, botManager])

  const selectedBot = botManager.botEntities.find((e) => e.id === selectedBotId) || null

  const handleSelectBot = useCallback((id: number | null) => {
    if (id !== null) {
      navigate(`/bots/${id}`)
      botManager.loadBotEntities()
    } else {
      navigate('/bots')
    }
  }, [navigate, botManager])

  const handleStartChatFromBot = useCallback((entityId: number) => {
    setNewChatEntityId(entityId)
    setShowNewChat(true)
  }, [])

  const handleOpenConversation = useCallback((convId: number) => {
    navigate(`/chat/${convId}`)
  }, [navigate])

  const handleBotDetailBack = useCallback(() => {
    navigate('/bots')
  }, [navigate])

  const handleHardDeleteBot = useCallback(async (botIdToDelete: number) => {
    await botManager.handleHardDeleteBot(botIdToDelete)
    navigate('/bots')
  }, [botManager, navigate])

  return (
    <div className="h-full flex min-h-0">
      {/* Left panel: BotList */}
      <div className={cn(
        'border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0 min-h-0 overflow-hidden',
        isMobile ? 'w-full h-full' : 'w-72',
        isMobile
          ? (selectedBotId ? 'hidden' : 'flex flex-col')
          : (selectedBotId ? 'hidden md:flex md:flex-col' : 'flex flex-col'),
      )}>
        <BotList
          selectedId={selectedBotId}
          onSelect={(id) => handleSelectBot(id)}
          onStartChat={handleStartChatFromBot}
          onCreated={(result) => {
            botManager.setCreatedCredentials(result)
            navigate(`/bots/${result.entity.id}`)
            botManager.loadBotEntities()
          }}
          refreshTrigger={botManager.botListRefresh}
        />
      </div>

      {/* Right panel: BotDetail */}
      <div className={cn(
        'flex-1 min-w-0 flex',
        isMobile && selectedBotId && 'mobile-chat-panel',
      )}>
        {(selectedBot || !isMobile) ? (
          <div className="flex-1 min-w-0" style={{ animation: 'fade-in 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
            <ErrorBoundary>
              <BotDetail
                bot={selectedBot}
                createdCredentials={selectedBot?.id === botManager.createdCredentials?.entity.id ? botManager.createdCredentials : null}
                onDismissCredentials={() => botManager.setCreatedCredentials(null)}
                onBack={handleBotDetailBack}
                onOpenConversation={handleOpenConversation}
                onDisable={botManager.handleDisableBot}
                onReactivate={botManager.handleReactivateBot}
                onHardDelete={handleHardDeleteBot}
                onStartChat={handleStartChatFromBot}
                onRefresh={botManager.loadBotEntities}
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
            convManager.loadConversations().then(() => navigate(`/chat/${convId}`))
          }}
        />
      ) : (
        showNewChat && (
          <NewConversationDialog
            preselectedEntityId={newChatEntityId}
            onClose={() => setShowNewChat(false)}
            onCreated={(convId) => {
              setShowNewChat(false)
              convManager.loadConversations().then(() => navigate(`/chat/${convId}`))
            }}
          />
        )
      )}
    </div>
  )
}
