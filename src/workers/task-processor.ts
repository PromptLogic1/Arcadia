import { createWorker } from 'bgio-vercel'

export default createWorker({
  concurrency: 5,
  ttl: 60,
  routes: {
    '/api/process-task': {
      retries: 3,
      timeout: 9500 // Keep under 10s
    }
  }
}) 