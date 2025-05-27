import { NextRequest } from 'next/server'

interface RateLimiterOptions {
  interval: number // in milliseconds
  uniqueTokenPerInterval: number
}

// Simple in-memory rate limiter (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export class RateLimiter {
  private interval: number
  private uniqueTokenPerInterval: number
  private readonly MAX_REQUESTS = 5
  private readonly WINDOW_MS = 60000 // 1 Minute
  private requests: Map<string, number[]> = new Map()

  constructor(options?: RateLimiterOptions) {
    this.interval = options?.interval || this.WINDOW_MS
    this.uniqueTokenPerInterval = options?.uniqueTokenPerInterval || 500
  }

  async isLimited(key: string): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - this.WINDOW_MS
    
    // Get existing requests for the key
    const keyRequests = this.requests.get(key) || []
    
    // Remove old requests
    const validRequests = keyRequests.filter(timestamp => timestamp > windowStart)
    
    // Add new request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return validRequests.length > this.MAX_REQUESTS
  }

  async check(req: NextRequest, limit: number, token: string): Promise<{ success: boolean }> {
    const now = Date.now()
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const key = `${token}_${ip}`
    
    const record = rateLimitMap.get(key) || { count: 0, lastReset: now }
    
    // Reset if interval has passed
    if (now - record.lastReset > this.interval) {
      record.count = 0
      record.lastReset = now
    }
    
    // Check if limit exceeded
    if (record.count >= limit) {
      return { success: false }
    }
    
    // Increment counter
    record.count++
    rateLimitMap.set(key, record)
    
    return { success: true }
  }
}

// Default rate limiter instance
export const rateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
}) 