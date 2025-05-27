export interface BingoGenerationPayload {
  gameCategory: string
  difficulty: string
  gridSize: number
}

export interface CodeExecutionPayload {
  code: string
  language: string
  timeout?: number
}

export type TaskPayload = BingoGenerationPayload | CodeExecutionPayload

export interface BingoGenerationResult {
  board: string
  cells: unknown[]
}

export interface CodeExecutionResult {
  success: boolean
  output: string
  executionTime: number
}

export type TaskResult = BingoGenerationResult | CodeExecutionResult

export interface Task {
  id: string
  type: string
  payload: TaskPayload
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
  result?: TaskResult
}

// Simple in-memory task queue (in production, use Redis Queue or similar)
const tasks = new Map<string, Task>()

export function queueTask(type: string, payload: TaskPayload): string {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const task: Task = {
    id: taskId,
    type,
    payload,
    status: 'pending',
    createdAt: new Date()
  }
  
  tasks.set(taskId, task)
  
  // Process task asynchronously
  processTask(taskId)
  
  return taskId
}

export function checkTaskStatus(taskId: string): Task | null {
  return tasks.get(taskId) || null
}

async function processTask(taskId: string): Promise<void> {
  const task = tasks.get(taskId)
  if (!task) return
  
  try {
    task.status = 'processing'
    tasks.set(taskId, task)
    
    // Simulate task processing based on type
    let result: TaskResult
    
    switch (task.type) {
      case 'bingo-generation':
        result = await generateBingoBoard(task.payload as BingoGenerationPayload)
        break
      case 'code-execution':
        result = await executeCode(task.payload as CodeExecutionPayload)
        break
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
    
    task.status = 'completed'
    task.result = result
    task.completedAt = new Date()
    
  } catch (error) {
    task.status = 'failed'
    task.error = error instanceof Error ? error.message : 'Unknown error'
    task.completedAt = new Date()
  }
  
  tasks.set(taskId, task)
}

// Mock task processors
async function generateBingoBoard(_payload: BingoGenerationPayload): Promise<BingoGenerationResult> {
  // Simulate bingo board generation
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { board: 'generated', cells: [] }
}

async function executeCode(_payload: CodeExecutionPayload): Promise<CodeExecutionResult> {
  // Simulate code execution
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { 
    success: true, 
    output: 'Code executed successfully',
    executionTime: 123
  }
} 