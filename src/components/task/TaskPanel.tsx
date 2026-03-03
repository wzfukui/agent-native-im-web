import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useTasksStore } from '@/store/tasks'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn } from '@/lib/utils'
import * as api from '@/lib/api'
import type { Task, TaskStatus, TaskPriority } from '@/lib/types'
import {
  X, Plus, Check, Circle, Clock, Ban,
  ChevronDown, Loader2, Trash2, Calendar,
} from 'lucide-react'

interface Props {
  conversationId: number
  participants: { entity_id: number; entity?: { id: number; display_name: string; name: string; entity_type: string } }[]
  onClose: () => void
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-yellow-400',
  high: 'bg-red-400',
}

const statusIcons: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  done: Check,
  cancelled: Ban,
}

export function TaskPanel({ conversationId, participants, onClose }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const tasks = useTasksStore((s) => s.byConv[conversationId] || [])
  const setTasks = useTasksStore((s) => s.setTasks)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [creating, setCreating] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const res = await api.listTasks(token, conversationId)
    if (res.ok && res.data) {
      setTasks(conversationId, Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [token, conversationId])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    const res = await api.createTask(token, conversationId, { title: title.trim(), priority })
    if (res.ok && res.data) {
      useTasksStore.getState().addTask(res.data)
      setTitle('')
      setShowForm(false)
    }
    setCreating(false)
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    const res = await api.updateTask(token, task.id, { status })
    if (res.ok && res.data) {
      useTasksStore.getState().updateTask(res.data)
    }
  }

  const handleDelete = async (task: Task) => {
    const res = await api.deleteTask(token, task.id)
    if (res.ok) {
      useTasksStore.getState().removeTask(conversationId, task.id)
    }
  }

  const grouped = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done' || t.status === 'cancelled'),
  }

  const statusLabels: Record<string, string> = {
    pending: t('task.pending'),
    in_progress: t('task.inProgress'),
    done: t('task.completed'),
  }

  return (
    <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('task.title')}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer text-[var(--color-accent)]"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={t('task.newTaskPlaceholder')}
            className="w-full h-8 px-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="text-[10px] px-2 py-1 rounded-md bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer focus:outline-none"
            >
              <option value="low">{t('task.low')}</option>
              <option value="medium">{t('task.medium')}</option>
              <option value="high">{t('task.high')}</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="px-3 py-1 rounded-lg bg-[var(--color-accent)] text-white text-[10px] font-medium cursor-pointer disabled:opacity-40"
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
            <p className="text-xs">{t('task.noTasks')}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([status, items]) => {
            if (items.length === 0) return null
            return (
              <div key={status}>
                <div className="px-4 py-2 bg-[var(--color-bg-primary)]/50">
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    {statusLabels[status]} ({items.length})
                  </span>
                </div>
                {items.map((task) => {
                  const StatusIcon = statusIcons[task.status]
                  return (
                    <div key={task.id} className="px-4 py-2.5 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] group">
                      <div className="flex items-start gap-2">
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', priorityColors[task.priority])} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-xs font-medium truncate',
                            task.status === 'done' ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.assignee && (
                              <div className="flex items-center gap-1">
                                <EntityAvatar entity={task.assignee} size="xs" />
                                <span className="text-[9px] text-[var(--color-text-muted)]">{entityDisplayName(task.assignee)}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-0.5 text-[9px] text-[var(--color-text-muted)]">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.status !== 'done' && (
                            <button
                              onClick={() => handleStatusChange(task, task.status === 'pending' ? 'in_progress' : 'done')}
                              className="p-1 hover:bg-[var(--color-success)]/15 rounded cursor-pointer"
                              title={task.status === 'pending' ? t('task.start') : t('task.complete')}
                            >
                              {task.status === 'pending' ? (
                                <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                              ) : (
                                <Check className="w-3 h-3 text-[var(--color-success)]" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(task)}
                            className="p-1 hover:bg-[var(--color-error)]/15 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-[var(--color-text-muted)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
