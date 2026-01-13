import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeAvailableSlots } from '@/lib/availability/computeSlots'

// Helper to get a date range for next week (starting next Sunday)
function getNextWeekRange(): { start: Date; end: Date; dates: string[] } {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday
  const daysUntilNextSunday = (7 - currentDay) % 7 || 7 // At least 1 day in future
  
  const start = new Date(now)
  start.setDate(start.getDate() + daysUntilNextSunday)
  start.setUTCHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  
  // Generate date strings for each day in the range
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  
  return { start, end, dates }
}

// Helper to create booking at a specific hour on a date
function createBooking(dateStr: string, hour: number): { start_time: string; end_time: string } {
  return {
    start_time: `${dateStr}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    end_time: `${dateStr}T${String(hour).padStart(2, '0')}:30:00.000Z`,
  }
}

describe('Daily Limit Feature', () => {
  it('should block all slots when daily limit is exactly reached', async () => {
    const { start, end, dates } = getNextWeekRange()

    // Create rules for all days of week - use 'weekday' field like the actual schema
    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      weekday: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Simulate 2 bookings on each day (Mon-Fri = days 1-5)
    const existingBookings = [
      createBooking(dates[1], 15), // Monday
      createBooking(dates[1], 16),
      createBooking(dates[2], 15), // Tuesday
      createBooking(dates[2], 16),
      createBooking(dates[3], 15), // Wednesday
      createBooking(dates[3], 16),
      createBooking(dates[4], 15), // Thursday
      createBooking(dates[4], 16),
      createBooking(dates[5], 15), // Friday
      createBooking(dates[5], 16),
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
    const limitedDates = [dates[1], dates[2], dates[3], dates[4], dates[5]]
    const limitedDaySlots = slots.filter(s => {
      const date = s.start.toISOString().split('T')[0]
      return limitedDates.includes(date)
    })
    
    const availableOnLimitedDays = limitedDaySlots.filter(s => s.available)
    expect(availableOnLimitedDays.length).toBe(0)
  })

  it('should allow slots on days under the limit', async () => {
    const { start, end, dates } = getNextWeekRange()

    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      weekday: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Only book day 1 (Monday) to limit
    const existingBookings = [
      createBooking(dates[1], 15),
      createBooking(dates[1], 16),
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

    // Day 1 (Monday) should be blocked, day 2 (Tuesday) should have slots
    const day2Slots = slots.filter(s => s.start.toISOString().startsWith(dates[2]))
    const availableDay2 = day2Slots.filter(s => s.available)
    
    // Day 2 has no bookings, should have available slots
    expect(availableDay2.length).toBeGreaterThan(0)
  })

  it('should work with no daily limit (0 means unlimited)', async () => {
    const { start, end, dates } = getNextWeekRange()

    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      weekday: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    }))

    // Even with many bookings, should still allow more if limit is 0
    const existingBookings = [
      createBooking(dates[1], 15),
      createBooking(dates[1], 16),
      createBooking(dates[1], 17),
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

    const day1Slots = slots.filter(s => s.start.toISOString().startsWith(dates[1]))
    const availableDay1 = day1Slots.filter(s => s.available)
    
    // With no limit, should still have available slots
    expect(availableDay1.length).toBeGreaterThan(0)
  })
})

describe('Buffer Times Integration', () => {
  it('should pass buffer params through to computeAvailableSlots', async () => {
    const { start, end } = getNextWeekRange()

    const availabilityRules = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      id: String(day),
      user_id: 'test-user',
      weekday: day,
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
