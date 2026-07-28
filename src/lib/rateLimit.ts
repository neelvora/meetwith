/**
 * Simple in-memory rate limiter
 * For production at scale, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store rate limit data in memory
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute

export interface RateLimitConfig {
  /** Number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSec: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number // seconds until reset
}

/**
 * Check and update rate limit for a given key
 * @param key - Unique identifier (e.g., IP address, user ID, or combination)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSec * 1000
  
  let entry = rateLimitStore.get(key)
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, entry)
    
    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowSec,
    }
  }
  
  // Increment count
  entry.count++
  
  const remaining = Math.max(0, config.limit - entry.count)
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)
  
  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn,
    }
  }
  
  return {
    success: true,
    remaining,
    resetIn,
  }
}

/**
 * Get client identifier from request headers
 * Uses X-Forwarded-For if behind a proxy, otherwise falls back to a fixed key
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Get first IP in the chain (client IP)
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback - in development or when IP is not available
  return 'unknown-client'
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  // Booking creation - generous but prevents abuse
  booking: { limit: 10, windowSec: 60 }, // 10 bookings per minute
  
  // API general - standard rate limit
  api: { limit: 100, windowSec: 60 }, // 100 requests per minute
  
  // Auth endpoints - stricter to prevent brute force
  auth: { limit: 5, windowSec: 60 }, // 5 attempts per minute
  
  // Slots endpoint - called frequently during booking
  slots: { limit: 30, windowSec: 60 }, // 30 requests per minute

  // Beta signup, abuse ceiling - counts every request, including dropped spam
  betaSignupBurst: { limit: 20, windowSec: 60 * 60 }, // 20 requests per hour per IP

  // Beta signup, accepted signups - only requests that clear the spam checks
  // count here, so a bot cannot exhaust a shared IP's budget for real people
  betaSignup: { limit: 3, windowSec: 60 * 60 }, // 3 signups per hour per IP

  // Beta signup, site-wide circuit breaker for a spam flood
  betaSignupGlobal: { limit: 30, windowSec: 60 * 60 }, // 30 per hour total

  // Beta signup, per address - caps how many confirmation emails one inbox can
  // be sent. Not 1, because a send that fails would otherwise lock a real
  // person out for a day; the confirm step is what stops repeat notifications.
  betaSignupEmail: { limit: 3, windowSec: 24 * 60 * 60 }, // 3 per day per email

  // Beta signup, flagged-as-suspicious notifications - keeps a flood of
  // labelled spam from filling the inbox while still showing a sample of it
  betaSignupFlagged: { limit: 5, windowSec: 60 * 60 }, // 5 per hour total
} as const
