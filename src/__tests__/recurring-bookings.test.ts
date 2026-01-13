import { describe, it, expect } from 'vitest'
import { generateRecurringSlots, validateRecurrenceConfig, describeRecurrence } from '@/lib/booking/recurring'
import type { RecurrenceConfig } from '@/types'

describe('Recurring Bookings', () => {
  describe('validateRecurrenceConfig', () => {
    it('should validate a valid count-based weekly recurrence', () => {
      const config: RecurrenceConfig = {
        type: 'weekly',
        days: [1, 3, 5], // Mon, Wed, Fri
        endType: 'count',
        count: 10,
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should validate a valid biweekly recurrence', () => {
      const config: RecurrenceConfig = {
        type: 'biweekly',
        endType: 'count',
        count: 8,
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid recurrence type', () => {
      const config = {
        type: 'invalid' as any,
        endType: 'count',
        count: 4,
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid recurrence type')
    })

    it('should reject count > 52', () => {
      const config: RecurrenceConfig = {
        type: 'weekly',
        endType: 'count',
        count: 100,
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('between 1 and 52')
    })

    it('should reject weekly with invalid day values', () => {
      const config: RecurrenceConfig = {
        type: 'weekly',
        days: [0, 7], // 7 is invalid
        endType: 'count',
        count: 4,
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be 0-6')
    })

    it('should reject date-based without end date', () => {
      const config: RecurrenceConfig = {
        type: 'monthly',
        endType: 'date',
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('End date is required')
    })

    it('should reject past end date', () => {
      const config: RecurrenceConfig = {
        type: 'monthly',
        endType: 'date',
        endDate: '2020-01-01',
      }
      const result = validateRecurrenceConfig(config)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be in the future')
    })
  })

  describe('generateRecurringSlots', () => {
    const timezone = 'America/Chicago'
    
    it('should generate daily recurring slots', () => {
      const firstStart = new Date('2025-02-01T09:00:00Z')
      const firstEnd = new Date('2025-02-01T09:30:00Z')
      const config: RecurrenceConfig = {
        type: 'daily',
        endType: 'count',
        count: 5,
      }

      const slots = generateRecurringSlots(firstStart, firstEnd, config, timezone)
      
      expect(slots).toHaveLength(5)
      expect(slots[0].index).toBe(1)
      expect(slots[4].index).toBe(5)
      
      // Each slot should be one day apart
      for (let i = 1; i < slots.length; i++) {
        const dayDiff = (slots[i].start.getTime() - slots[i - 1].start.getTime()) / (1000 * 60 * 60 * 24)
        expect(dayDiff).toBe(1)
      }
    })

    it('should generate weekly recurring slots', () => {
      const firstStart = new Date('2025-02-03T15:00:00Z') // Monday
      const firstEnd = new Date('2025-02-03T15:30:00Z')
      const config: RecurrenceConfig = {
        type: 'weekly',
        endType: 'count',
        count: 4,
      }

      const slots = generateRecurringSlots(firstStart, firstEnd, config, timezone)
      
      expect(slots).toHaveLength(4)
      
      // Each slot should be 7 days apart
      for (let i = 1; i < slots.length; i++) {
        const dayDiff = (slots[i].start.getTime() - slots[i - 1].start.getTime()) / (1000 * 60 * 60 * 24)
        expect(dayDiff).toBe(7)
      }
    })

    it('should generate biweekly recurring slots', () => {
      const firstStart = new Date('2025-02-03T15:00:00Z')
      const firstEnd = new Date('2025-02-03T15:30:00Z')
      const config: RecurrenceConfig = {
        type: 'biweekly',
        endType: 'count',
        count: 3,
      }

      const slots = generateRecurringSlots(firstStart, firstEnd, config, timezone)
      
      expect(slots).toHaveLength(3)
      
      // Each slot should be 14 days apart
      for (let i = 1; i < slots.length; i++) {
        const dayDiff = (slots[i].start.getTime() - slots[i - 1].start.getTime()) / (1000 * 60 * 60 * 24)
        expect(dayDiff).toBe(14)
      }
    })

    it('should generate monthly recurring slots', () => {
      const firstStart = new Date('2025-02-15T15:00:00Z')
      const firstEnd = new Date('2025-02-15T15:30:00Z')
      const config: RecurrenceConfig = {
        type: 'monthly',
        endType: 'count',
        count: 3,
      }

      const slots = generateRecurringSlots(firstStart, firstEnd, config, timezone)
      
      expect(slots).toHaveLength(3)
      
      // Check months are different
      expect(new Date(slots[0].start).getMonth()).toBe(1) // Feb
      expect(new Date(slots[1].start).getMonth()).toBe(2) // Mar
      expect(new Date(slots[2].start).getMonth()).toBe(3) // Apr
    })

    it('should preserve slot duration', () => {
      const firstStart = new Date('2025-02-01T09:00:00Z')
      const firstEnd = new Date('2025-02-01T10:00:00Z') // 60 minutes
      const config: RecurrenceConfig = {
        type: 'weekly',
        endType: 'count',
        count: 4,
      }

      const slots = generateRecurringSlots(firstStart, firstEnd, config, timezone)
      
      // All slots should be 60 minutes
      for (const slot of slots) {
        const durationMs = slot.end.getTime() - slot.start.getTime()
        expect(durationMs).toBe(60 * 60 * 1000)
      }
    })

    it('should cap at maxOccurrences', () => {
      const firstStart = new Date('2025-02-01T09:00:00Z')
      const firstEnd = new Date('2025-02-01T09:30:00Z')
      const config: RecurrenceConfig = {
        type: 'daily',
        endType: 'never',
      }

      const slots = generateRecurringSlots(firstStart, firstEnd, config, timezone, 10)
      
      expect(slots).toHaveLength(10)
    })
  })

  describe('describeRecurrence', () => {
    it('should describe daily recurrence', () => {
      const config: RecurrenceConfig = {
        type: 'daily',
        endType: 'count',
        count: 5,
      }
      const description = describeRecurrence(config)
      expect(description).toContain('Every day')
      expect(description).toContain('5 occurrences')
    })

    it('should describe weekly recurrence with days', () => {
      const config: RecurrenceConfig = {
        type: 'weekly',
        days: [1, 3, 5],
        endType: 'count',
        count: 10,
      }
      const description = describeRecurrence(config)
      expect(description).toContain('Every week')
      expect(description).toContain('Monday')
      expect(description).toContain('Wednesday')
      expect(description).toContain('Friday')
    })

    it('should describe biweekly recurrence', () => {
      const config: RecurrenceConfig = {
        type: 'biweekly',
        endType: 'never',
      }
      const description = describeRecurrence(config)
      expect(description).toContain('Every 2 weeks')
      expect(description).toContain('indefinitely')
    })

    it('should describe monthly recurrence with end date', () => {
      const config: RecurrenceConfig = {
        type: 'monthly',
        endType: 'date',
        endDate: '2025-12-31',
      }
      const description = describeRecurrence(config)
      expect(description).toContain('Every month')
      expect(description).toContain('until')
    })
  })
})
