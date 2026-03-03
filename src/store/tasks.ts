import { create } from 'zustand'
import type { Task } from '@/lib/types'

interface TasksState {
  // tasks per conversation
  byConv: Record<number, Task[]>
  setTasks: (convId: number, tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  removeTask: (convId: number, taskId: number) => void
}

export const useTasksStore = create<TasksState>((set) => ({
  byConv: {},
  setTasks: (convId, tasks) => set((s) => ({
    byConv: { ...s.byConv, [convId]: tasks },
  })),
  addTask: (task) => set((s) => ({
    byConv: {
      ...s.byConv,
      [task.conversation_id]: [...(s.byConv[task.conversation_id] || []), task],
    },
  })),
  updateTask: (task) => set((s) => ({
    byConv: {
      ...s.byConv,
      [task.conversation_id]: (s.byConv[task.conversation_id] || []).map((t) =>
        t.id === task.id ? task : t
      ),
    },
  })),
  removeTask: (convId, taskId) => set((s) => ({
    byConv: {
      ...s.byConv,
      [convId]: (s.byConv[convId] || []).filter((t) => t.id !== taskId),
    },
  })),
}))
