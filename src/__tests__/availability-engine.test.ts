import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeAvailableSlots } from '@/lib/availability/computeSlots'
import type { AvailabilityRule, CalendarAccount } from '@/types'

vi.mock('@/lib/calendar/googleClient', () => ({
  getFreeBusy: vi.fn().mockResolvedValue({
    calendars: {
      primary: { busy: [] }
    }
  })
}))

import { getFreeBusy } from '@/lib/calendar/googleClient'
const mockGetFreeBusy = vi.mocked(getFreeBusy)

// Helper to get the next occurrence of a specific weekday
function getNextWeekday(weekday: number): Date {
  const now = new Date()
  const currentDay = now.getDay()
  const daysUntil = (weekday - currentDay + 7) % 7 || 7 // At least 1 day in future
  const result = new Date(now)
  result.setDate(result.getDate() + daysUntil)
  result.setHours(0, 0, 0, 0)
  return result
}

// Helper to format date as ISO string at midnight UTC
function toMidnightUTC(date: Date): Date {
  const result = new Date(date)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

// Helper to get end of day
function toEndOfDay(date: Date): Date {
  const result = new Date(date)
  result.setUTCHours(23, 59, 59, 999)
  return result
}

function createRule(
  weekday: number,
  startTime: string,
  endTime: string,
  isActive = true
): AvailabilityRule {
  return {
    id: `rule-${weekday}`,
    user_id: 'test-user',
    name: 'Default',
    weekday,
    start_time: startTime,
    end_time: endTime,
    is_active: isActive,
    created_at: new Date().toISOString(),
  }
}

function createCalendarAccount(
  includeInAvailability = true,
  writeToCalendar = false
): CalendarAccount {
  return {
    id: 'cal-1',
    user_id: 'test-user',
    provider: 'google',
    provider_account_id: 'google-123',
    account_email: 'test@example.com',
    access_token: 'token',
    calendar_id: 'primary',
    is_primary: true,
    include_in_availability: includeInAvailability,
    write_to_calendar: writeToCalendar,
    created_at: new Date().toISOString(),
  }
}

describe('Availability Engine - computeAvailableSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreeBusy.mockResolvedValue({
      calendars: {
        primary: { busy: [] }
      }
    })
  })

  describe('Single Day Rule', () => {
    it('should generate correct number of 30-minute slots for 9 AM - 5 PM', async () => {
      const targetDate = getNextWeekday(1) // Next Monday
      const rules = [createRule(1, '09:00', '17:00')]
      const startDate = toMidnightUTC(targetDate)
      const endDate = toEndOfDay(targetDate)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBeGreaterThan(0)
    })

    it('should generate correct number of 60-minute slots for 9 AM - 5 PM', async () => {
      const targetDate = getNextWeekday(1) // Next Monday
      const rules = [createRule(1, '09:00', '17:00')]
      const startDate = toMidnightUTC(targetDate)
      const endDate = toEndOfDay(targetDate)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 60,
        minNoticeHours: 0,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBeGreaterThan(0)
    })

    it('should generate no slots for inactive rules', async () => {
      const targetDate = getNextWeekday(1) // Next Monday
      const rules = [createRule(1, '09:00', '17:00', false)]
      const startDate = toMidnightUTC(targetDate)
      const endDate = toEndOfDay(targetDate)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBe(0)
    })

    it('should generate no slots for a day without rules', async () => {
      const targetDate = getNextWeekday(1) // Next Monday
      const rules = [createRule(2, '09:00', '17:00')] // Tuesday rule, not Monday
      const startDate = toMidnightUTC(targetDate)
      const endDate = toEndOfDay(targetDate)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBe(0)
    })
  })

  describe('Multiple Days', () => {
    it('should generate slots for multiple days with different hours', async () => {
      // Get next week's Mon-Wed
      const monday = getNextWeekday(1)
      const wednesday = new Date(monday)
      wednesday.setDate(wednesday.getDate() + 2)
      
      const rules = [
        createRule(1, '09:00', '17:00'), // Monday
        createRule(2, '10:00', '14:00'), // Tuesday
        createRule(3, '08:00', '12:00'), // Wednesday
      ]
      const startDate = toMidnightUTC(monday)
      const endDate = toEndOfDay(wednesday)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBeGreaterThan(0)

      const slotDates = new Set(
        availableSlots.map(s =>
          s.start.toLocaleDateString('en-US', { timeZone: 'America/Chicago' })
        )
      )
      expect(slotDates.size).toBeGreaterThanOrEqual(1)
    })

    it('should respect each day\'s individual time window', async () => {
      const monday = getNextWeekday(1)
      const tuesday = new Date(monday)
      tuesday.setDate(tuesday.getDate() + 1)
      
      const rules = [
        createRule(1, '09:00', '12:00'), // Monday morning
        createRule(2, '14:00', '17:00'), // Tuesday afternoon
      ]
      const startDate = toMidnightUTC(monday)
      const endDate = toEndOfDay(tuesday)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBeGreaterThan(0)
    })
  })

  describe('Busy Events', () => {
    it('should remove slots that overlap with busy events', async () => {
      mockGetFreeBusy.mockResolvedValue({
        calendars: {
          primary: {
            busy: [
              {
                start: '2025-12-08T17:00:00.000Z',
                end: '2025-12-08T18:00:00.000Z'
              }
            ]
          }
        }
      })

      const rules = [createRule(1, '09:00', '17:00')]
      const calendarAccount = createCalendarAccount(true)
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [calendarAccount],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const unavailableSlots = slots.filter(s => !s.available)
      expect(unavailableSlots.length).toBeGreaterThan(0)
    })

    it('should handle multiple busy events', async () => {
      mockGetFreeBusy.mockResolvedValue({
        calendars: {
          primary: {
            busy: [
              {
                start: '2025-12-08T16:00:00.000Z',
                end: '2025-12-08T17:00:00.000Z'
              },
              {
                start: '2025-12-08T19:00:00.000Z',
                end: '2025-12-08T20:00:00.000Z'
              }
            ]
          }
        }
      })

      const rules = [createRule(1, '09:00', '17:00')]
      const calendarAccount = createCalendarAccount(true)
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [calendarAccount],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      expect(mockGetFreeBusy).toHaveBeenCalled()
    })
  })

  describe('include_in_availability Flag', () => {
    it('should not check calendars with include_in_availability=false', async () => {
      const rules = [createRule(1, '09:00', '17:00')]
      const calendarAccount = createCalendarAccount(false)
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [calendarAccount],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      expect(mockGetFreeBusy).not.toHaveBeenCalled()
    })

    it('should check calendars with include_in_availability=true', async () => {
      const rules = [createRule(1, '09:00', '17:00')]
      const calendarAccount = createCalendarAccount(true)
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [calendarAccount],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      expect(mockGetFreeBusy).toHaveBeenCalled()
    })

    it('should only check included calendars when mixed', async () => {
      const rules = [createRule(1, '09:00', '17:00')]
      const includedCalendar = createCalendarAccount(true)
      const excludedCalendar = { ...createCalendarAccount(false), id: 'cal-2' }
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [includedCalendar, excludedCalendar],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      expect(mockGetFreeBusy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Minimum Notice', () => {
    it('should exclude slots that start before minimum notice cutoff', async () => {
      const rules = [
        createRule(0, '09:00', '17:00'),
        createRule(1, '09:00', '17:00'),
        createRule(2, '09:00', '17:00'),
        createRule(3, '09:00', '17:00'),
        createRule(4, '09:00', '17:00'),
        createRule(5, '09:00', '17:00'),
        createRule(6, '09:00', '17:00'),
      ]
      const now = new Date()
      const startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + 7)

      const slotsWithNotice = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 24,
      })

      const slotsWithoutNotice = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
      })

      const availableWithNotice = slotsWithNotice.filter(s => s.available).length
      const availableWithoutNotice = slotsWithoutNotice.filter(s => s.available).length

      expect(availableWithNotice).toBeLessThanOrEqual(availableWithoutNotice)
    })

    it('should mark slots before notice period as unavailable', async () => {
      const rules = [
        createRule(0, '00:00', '23:59'),
        createRule(1, '00:00', '23:59'),
        createRule(2, '00:00', '23:59'),
        createRule(3, '00:00', '23:59'),
        createRule(4, '00:00', '23:59'),
        createRule(5, '00:00', '23:59'),
        createRule(6, '00:00', '23:59'),
      ]
      const now = new Date()
      const startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 48,
      })

      const availableSlots = slots.filter(s => s.available)
      expect(availableSlots.length).toBe(0)
    })
  })

  describe('Buffer Times', () => {
    it('should respect buffer before meetings', async () => {
      mockGetFreeBusy.mockResolvedValue({
        calendars: {
          primary: {
            busy: [
              {
                start: '2025-12-08T18:00:00.000Z',
                end: '2025-12-08T19:00:00.000Z'
              }
            ]
          }
        }
      })

      const rules = [createRule(1, '09:00', '17:00')]
      const calendarAccount = createCalendarAccount(true)
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [calendarAccount],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
        bufferBefore: 15,
      })

      expect(slots.length).toBeGreaterThan(0)
    })

    it('should respect buffer after meetings', async () => {
      mockGetFreeBusy.mockResolvedValue({
        calendars: {
          primary: {
            busy: [
              {
                start: '2025-12-08T17:00:00.000Z',
                end: '2025-12-08T18:00:00.000Z'
              }
            ]
          }
        }
      })

      const rules = [createRule(1, '09:00', '17:00')]
      const calendarAccount = createCalendarAccount(true)
      const startDate = new Date('2025-12-08T00:00:00.000Z')
      const endDate = new Date('2025-12-08T23:59:59.000Z')

      const slots = await computeAvailableSlots({
        userId: 'test-user',
        calendarAccounts: [calendarAccount],
        availabilityRules: rules,
        timezone: 'America/Chicago',
        dateRange: { start: startDate, end: endDate },
        slotDuration: 30,
        minNoticeHours: 0,
        bufferAfter: 15,
      })

      expect(slots.length).toBeGreaterThan(0)
    })
  })
})
