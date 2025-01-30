type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface Task {
  id: string
  status: TaskStatus
  result?: unknown
  error?: string
}

const taskStore = new Map<string, Task>()

export async function queueTask(taskId: string): Promise<void> {
  taskStore.set(taskId, {
    id: taskId,
    status: 'pending'
  })
}

export async function checkTaskStatus(taskId: string): Promise<Task | null> {
  return taskStore.get(taskId) || null
} 