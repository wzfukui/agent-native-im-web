import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { JoinInvitePage } from '@/components/invite/JoinInvitePage'
import * as api from '@/lib/api'
import { useConversationsStore } from '@/store/conversations'

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
