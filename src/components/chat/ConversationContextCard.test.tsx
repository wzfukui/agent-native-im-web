import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ConversationContextCard } from './ConversationContextCard'
import { useAuthStore } from '@/store/auth'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === 'memory.contextSummary') return `${vars?.count ?? 0}/${vars?.messages ?? 0}`
      if (key === 'memory.contextTaskSummary') return `${vars?.open ?? 0}/${vars?.done ?? 0}`
      if (key === 'memory.contextTopTask') return 'Top task'
      return key
    },
  }),
}))

vi.mock('lucide-react', () => {
  const Icon = () => null
  return {
    Brain: Icon,
    ChevronRight: Icon,
    ListTodo: Icon,
    MessagesSquare: Icon,
    TerminalSquare: Icon,
  }
})

const listMemories = vi.fn()
const listTasks = vi.fn()
const cacheConversationContext = vi.fn()
const getCachedConversationContext = vi.fn()

vi.mock('@/lib/api', () => ({
  listMemories: (...args: unknown[]) => listMemories(...args),
  listTasks: (...args: unknown[]) => listTasks(...args),
}))

vi.mock('@/lib/cache', () => ({
  cacheConversationContext: (...args: unknown[]) => cacheConversationContext(...args),
  getCachedConversationContext: (...args: unknown[]) => getCachedConversationContext(...args),
}))

describe('ConversationContextCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: 'test-token',
      entity: {
        id: 1,
        entity_type: 'user',
        name: 'chris',
        status: 'active',
        metadata: {},
        created_at: '',
        updated_at: '',
      } as any,
      sessionChecked: true,
    })
    getCachedConversationContext.mockResolvedValue(null)
    listMemories.mockResolvedValue({
      ok: true,
      data: {
        prompt: 'Prompt text',
        memories: [
          { id: 1, key: 'goal', content: 'Ship ANI' },
        ],
      },
    })
    listTasks.mockResolvedValue({
      ok: true,
      data: [
        { id: 10, title: 'Fix refetch loop', status: 'pending' },
      ],
    })
    cacheConversationContext.mockResolvedValue(undefined)
  })

  it('fetches memories and tasks once on initial render', async () => {
    render(
      <ConversationContextCard
        conversationId={123}
        prompt=""
        messageCount={4}
      />,
    )

    await waitFor(() => {
      expect(listMemories).toHaveBeenCalledTimes(1)
      expect(listTasks).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('Prompt text')).toBeInTheDocument()
      expect(screen.getByText(/Fix refetch loop/)).toBeInTheDocument()
    })

    expect(cacheConversationContext).toHaveBeenCalledTimes(1)
  })
})
