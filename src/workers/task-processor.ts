import { logger } from '@/src/lib/logger';

export interface TaskProcessorConfig {
  concurrency?: number;
  timeout?: number;
  retries?: number;
}

export interface ProcessorRoute {
  retries: number;
  timeout: number;
}

export interface TaskProcessorOptions {
  concurrency: number;
  ttl: number;
  routes: Record<string, ProcessorRoute>;
}

export interface TaskContext {
  taskId: string;
  type: string;
  startTime: number;
  retries: number;
}

/**
 * Simple task processor for handling background tasks
 * This replaces the non-existent 'bgio-vercel' dependency
 * Compatible with Next.js and Vercel deployment
 */
class TaskProcessor {
  private config: TaskProcessorOptions;
  private processingTasks = new Map<string, TaskContext>();
  private taskQueue: Array<{ taskId: string; processor: () => Promise<unknown> }> = [];
  private isProcessing = false;

  constructor(config: TaskProcessorOptions) {
    this.config = config;
  }

  async processTask(taskId: string, processor: () => Promise<unknown>): Promise<unknown> {
    if (this.processingTasks.has(taskId)) {
      throw new Error(`Task ${taskId} is already being processed`);
    }

    if (this.processingTasks.size >= this.config.concurrency) {
      // Queue the task if at capacity
      return new Promise((resolve, reject) => {
        this.taskQueue.push({
          taskId,
          processor: async () => {
            try {
              const result = await this.executeTask(taskId, processor);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
        });
        this.processQueue();
      });
    }

    return this.executeTask(taskId, processor);
  }

  private async executeTask(taskId: string, processor: () => Promise<unknown>): Promise<unknown> {
    const context: TaskContext = {
      taskId,
      type: 'task',
      startTime: Date.now(),
      retries: 0,
    };

    this.processingTasks.set(taskId, context);

    try {
      logger.debug('Starting task processing', {
        metadata: { taskId, processor: 'TaskProcessor' }
      });

      const result = await Promise.race([
        processor(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), this.config.ttl * 1000)
        )
      ]);

      logger.debug('Task processing completed', {
        metadata: { 
          taskId, 
          processor: 'TaskProcessor',
          duration: Date.now() - context.startTime
        }
      });

      return result;
    } catch (error) {
      logger.error('Task processing failed', error as Error, {
        metadata: { 
          taskId, 
          processor: 'TaskProcessor',
          duration: Date.now() - context.startTime,
          retries: context.retries
        }
      });
      throw error;
    } finally {
      this.processingTasks.delete(taskId);
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    if (this.processingTasks.size >= this.config.concurrency) {
      return;
    }

    this.isProcessing = true;
    const nextTask = this.taskQueue.shift();
    
    if (nextTask) {
      try {
        await nextTask.processor();
      } catch (error) {
        logger.error('Queued task failed', error as Error, {
          metadata: { taskId: nextTask.taskId }
        });
      }
    }

    this.isProcessing = false;
    
    // Process next task if available
    if (this.taskQueue.length > 0 && this.processingTasks.size < this.config.concurrency) {
      setImmediate(() => this.processQueue());
    }
  }

  getActiveTaskCount(): number {
    return this.processingTasks.size;
  }

  getQueuedTaskCount(): number {
    return this.taskQueue.length;
  }

  isAtCapacity(): boolean {
    return this.processingTasks.size >= this.config.concurrency;
  }

  getTaskStatus(taskId: string): TaskContext | null {
    return this.processingTasks.get(taskId) || null;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down task processor', {
      metadata: { 
        activeTasks: this.processingTasks.size,
        queuedTasks: this.taskQueue.length
      }
    });

    // Wait for active tasks to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.processingTasks.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear remaining queue
    this.taskQueue.length = 0;
  }
}

export function createWorker(options: TaskProcessorOptions): TaskProcessor {
  return new TaskProcessor(options);
}

// Export the default worker instance with improved configuration
const defaultWorker = createWorker({
  concurrency: process.env.NODE_ENV === 'production' ? 10 : 5,
  ttl: 60,
  routes: {
    '/api/process-task': {
      retries: 3,
      timeout: 9500 // Keep under 10s for Vercel
    },
    '/api/bingo/sessions': {
      retries: 2,
      timeout: 5000
    }
  }
});

export default defaultWorker;

// Handle process exit gracefully
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    defaultWorker.shutdown().catch(console.error);
  });

  process.on('SIGINT', () => {
    defaultWorker.shutdown().catch(console.error);
  });
}
