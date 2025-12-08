import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit } from '@/lib/rateLimit'

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Each test gets a unique key prefix to avoid interference
  })

  it('should allow requests within the limit', () => {
    const key = `test-${Date.now()}-allow`
    const config = { limit: 5, windowSec: 60 }

    // First request
    const result1 = checkRateLimit(key, config)
    expect(result1.success).toBe(true)
    expect(result1.remaining).toBe(4)

    // Second request
    const result2 = checkRateLimit(key, config)
    expect(result2.success).toBe(true)
    expect(result2.remaining).toBe(3)
  })

  it('should block requests over the limit', () => {
    const key = `test-${Date.now()}-block`
    const config = { limit: 3, windowSec: 60 }

    // Use up the limit
    checkRateLimit(key, config)
    checkRateLimit(key, config)
    checkRateLimit(key, config)

    // Fourth request should be blocked
    const result = checkRateLimit(key, config)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetIn).toBeGreaterThan(0)
    expect(result.resetIn).toBeLessThanOrEqual(60)
  })

  it('should track different keys separately', () => {
    const key1 = `test-${Date.now()}-key1`
    const key2 = `test-${Date.now()}-key2`
    const config = { limit: 2, windowSec: 60 }

    // Use up key1's limit
    checkRateLimit(key1, config)
    checkRateLimit(key1, config)
    const result1 = checkRateLimit(key1, config)
    expect(result1.success).toBe(false)

    // key2 should still work
    const result2 = checkRateLimit(key2, config)
    expect(result2.success).toBe(true)
    expect(result2.remaining).toBe(1)
  })

  it('should provide correct resetIn value', () => {
    const key = `test-${Date.now()}-reset`
    const config = { limit: 5, windowSec: 30 }

    const result = checkRateLimit(key, config)
    expect(result.resetIn).toBeLessThanOrEqual(30)
    expect(result.resetIn).toBeGreaterThan(0)
  })

  it('should handle single-request limit', () => {
    const key = `test-${Date.now()}-single`
    const config = { limit: 1, windowSec: 60 }

    const result1 = checkRateLimit(key, config)
    expect(result1.success).toBe(true)
    expect(result1.remaining).toBe(0)

    const result2 = checkRateLimit(key, config)
    expect(result2.success).toBe(false)
  })
})
