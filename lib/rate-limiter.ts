// lib/rate-limiter.ts
export class RateLimiter {
    private readonly MAX_REQUESTS = 5
    private readonly WINDOW_MS = 60000 // 1 Minute
    private requests: Map<string, number[]> = new Map()
  
    async isLimited(key: string): Promise<boolean> {
      const now = Date.now()
      const windowStart = now - this.WINDOW_MS
      
      // Bestehende Requests für den Key holen
      const keyRequests = this.requests.get(key) || []
      
      // Alte Requests entfernen
      const validRequests = keyRequests.filter(timestamp => timestamp > windowStart)
      
      // Neuen Request hinzufügen
      validRequests.push(now)
      this.requests.set(key, validRequests)
      
      return validRequests.length > this.MAX_REQUESTS
    }
  }