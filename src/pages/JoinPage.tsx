import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { JoinInvitePage } from '@/components/invite/JoinInvitePage'
import * as api from '@/lib/api'
import { useConversationsStore } from '@/store/conversations'

function conversationRouteFor(conversation: { id: number; public_id?: string; metadata?: Record<string, unknown> } | null | undefined): string {
  if (!conversation) return '/chat'
  const meta = conversation.metadata as Record<string, unknown> | undefined
  const publicId = conversation.public_id || (typeof meta?.public_id === 'string' ? meta.public_id : '')
  return publicId ? `/chat/public/${encodeURIComponent(publicId)}` : `/chat/${conversation.id}`
}

export function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()

  if (!code || !token) {
    navigate('/chat', { replace: true })
    return null
  }

  return (
    <JoinInvitePage
      code={code}
      token={token}
      onJoined={(convId) => {
        // Reload conversations and navigate to the joined conversation
        api.listConversations(token).then((res) => {
          if (res.ok && res.data) {
            const convs = Array.isArray(res.data) ? res.data : []
            useConversationsStore.getState().setConversations(convs)
            const conversation = convs.find((item) => item.id === convId)
            navigate(conversationRouteFor(conversation || { id: convId }), { replace: true })
            return
          }
          navigate(`/chat/${convId}`, { replace: true })
        })
      }}
      onCancel={() => {
        navigate('/chat', { replace: true })
      }}
    />
  )
}
