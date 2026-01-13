import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeAvailableSlots } from '@/lib/availability/computeSlots'

describe('Daily Limit Feature', () => {
  it('should block all slots when daily limit is exactly reached', async () => {
    // Use a date range that spans a week to catch any day
    const start = new Date('2026-01-12T00:00:00.000Z')
    const end = new Date('2026-01-19T00:00:00.000Z')

    // Create rules for all days of week
    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Simulate bookings on each day that hit the limit
    const existingBookings = [
      // Multiple bookings spread across the week
      { start_time: '2026-01-13T15:00:00.000Z', end_time: '2026-01-13T15:30:00.000Z' },
      { start_time: '2026-01-13T16:00:00.000Z', end_time: '2026-01-13T16:30:00.000Z' },
      { start_time: '2026-01-14T15:00:00.000Z', end_time: '2026-01-14T15:30:00.000Z' },
      { start_time: '2026-01-14T16:00:00.000Z', end_time: '2026-01-14T16:30:00.000Z' },
      { start_time: '2026-01-15T15:00:00.000Z', end_time: '2026-01-15T15:30:00.000Z' },
      { start_time: '2026-01-15T16:00:00.000Z', end_time: '2026-01-15T16:30:00.000Z' },
      { start_time: '2026-01-16T15:00:00.000Z', end_time: '2026-01-16T15:30:00.000Z' },
      { start_time: '2026-01-16T16:00:00.000Z', end_time: '2026-01-16T16:30:00.000Z' },
      { start_time: '2026-01-17T15:00:00.000Z', end_time: '2026-01-17T15:30:00.000Z' },
      { start_time: '2026-01-17T16:00:00.000Z', end_time: '2026-01-17T16:30:00.000Z' },
    ]

    const slots = await computeAvailableSlots({
      userId: 'test-user',
      calendarAccounts: [],
      availabilityRules,
      timezone: 'UTC', // Use UTC to avoid timezone issues in test
      dateRange: { start, end },
      slotDuration: 30,
      minNoticeHours: 0,
      dailyLimit: 2, // Max 2 per day - all days at limit
      existingBookings,
    })

    // Days with 2 bookings should have 0 available slots
    // Count slots for Jan 13-17 specifically
    const limitedDaySlots = slots.filter(s => {
      const date = s.start.toISOString().split('T')[0]
      return ['2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17'].includes(date)
    })
    
    const availableOnLimitedDays = limitedDaySlots.filter(s => s.available)
    expect(availableOnLimitedDays.length).toBe(0)
  })

  it('should allow slots on days under the limit', async () => {
    const start = new Date('2026-01-12T00:00:00.000Z')
    const end = new Date('2026-01-19T00:00:00.000Z')

    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Only book Jan 13 to limit
    const existingBookings = [
      { start_time: '2026-01-13T15:00:00.000Z', end_time: '2026-01-13T15:30:00.000Z' },
      { start_time: '2026-01-13T16:00:00.000Z', end_time: '2026-01-13T16:30:00.000Z' },
    ]

    const slots = await computeAvailableSlots({
      userId: 'test-user',
      calendarAccounts: [],
      availabilityRules,
      timezone: 'UTC',
      dateRange: { start, end },
      slotDuration: 30,
      minNoticeHours: 0,
      dailyLimit: 2,
      existingBookings,
    })

    // Jan 13 should be blocked, other days should have slots
    const jan14Slots = slots.filter(s => s.start.toISOString().startsWith('2026-01-14'))
    const availableJan14 = jan14Slots.filter(s => s.available)
    
    // Jan 14 has no bookings, should have available slots
    expect(availableJan14.length).toBeGreaterThan(0)
  })

  it('should work with no daily limit (0 means unlimited)', async () => {
    const start = new Date('2026-01-12T00:00:00.000Z')
    const end = new Date('2026-01-19T00:00:00.000Z')

    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Even with many bookings, should still allow more if limit is 0
    const existingBookings = [
      { start_time: '2026-01-13T15:00:00.000Z', end_time: '2026-01-13T15:30:00.000Z' },
      { start_time: '2026-01-13T16:00:00.000Z', end_time: '2026-01-13T16:30:00.000Z' },
      { start_time: '2026-01-13T17:00:00.000Z', end_time: '2026-01-13T17:30:00.000Z' },
    ]

    const slots = await computeAvailableSlots({
      userId: 'test-user',
      calendarAccounts: [],
      availabilityRules,
      timezone: 'UTC',
      dateRange: { start, end },
      slotDuration: 30,
      minNoticeHours: 0,
      dailyLimit: 0, // 0 = unlimited
      existingBookings,
    })

    const jan13Slots = slots.filter(s => s.start.toISOString().startsWith('2026-01-13'))
    const availableJan13 = jan13Slots.filter(s => s.available)
    
    // With no limit, should still have available slots
    expect(availableJan13.length).toBeGreaterThan(0)
  })
})

describe('Buffer Times Integration', () => {
  it('should pass buffer params through to computeAvailableSlots', async () => {
    // This test verifies the function accepts the buffer parameters
    // The actual buffer logic was already tested in the existing test suite
    const start = new Date('2026-01-12T00:00:00.000Z')
    const end = new Date('2026-01-19T00:00:00.000Z')

    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Should not throw when passing buffer params
    const slots = await computeAvailableSlots({
      userId: 'test-user',
      calendarAccounts: [],
      availabilityRules,
      timezone: 'UTC',
      dateRange: { start, end },
      slotDuration: 30,
      minNoticeHours: 0,
      bufferBefore: 15,
      bufferAfter: 10,
      dailyLimit: 0,
      existingBookings: [],
    })

    expect(Array.isArray(slots)).toBe(true)
  })
})
