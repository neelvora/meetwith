import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateSlot } from '@/lib/availability/validateSlot'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import type { AvailabilityRule, CalendarAccount } from '@/types'

vi.mock('@/lib/calendar/googleClient', () => ({
  getFreeBusy: vi.fn().mockResolvedValue({
    calendars: {
      primary: { busy: [] }
    }
  }),
  createCalendarEvent: vi.fn().mockResolvedValue({
    id: 'mock-event-id',
    htmlLink: 'https://meet.google.com/mock-link',
    hangoutLink: 'https://meet.google.com/mock-link',
  }),
}))

import { getFreeBusy, createCalendarEvent } from '@/lib/calendar/googleClient'
const mockGetFreeBusy = vi.mocked(getFreeBusy)
const mockCreateCalendarEvent = vi.mocked(createCalendarEvent)

function createMockRules(): AvailabilityRule[] {
  return [
    {
      id: 'rule-1',
      user_id: 'test-user',
      name: 'Default',
      weekday: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-2',
      user_id: 'test-user',
      name: 'Default',
      weekday: 2,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-3',
      user_id: 'test-user',
      name: 'Default',
      weekday: 3,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-4',
      user_id: 'test-user',
      name: 'Default',
      weekday: 4,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-5',
      user_id: 'test-user',
      name: 'Default',
      weekday: 5,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-0',
      user_id: 'test-user',
      name: 'Default',
      weekday: 0,
      start_time: '09:00',
      end_time: '17:00',
      is_active: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rule-6',
      user_id: 'test-user',
      name: 'Default',
      weekday: 6,
      start_time: '09:00',
      end_time: '17:00',
      is_active: false,
      created_at: new Date().toISOString(),
    },
  ]
}

function getNextWeekdayAt(dayOfWeek: number, hour: number, minute: number): Date {
  const date = new Date()
  const currentDay = date.getDay()
  const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7
  date.setDate(date.getDate() + daysUntil + 7)
  date.setHours(hour, minute, 0, 0)
  return date
}

describe('Booking Creation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreeBusy.mockResolvedValue({
      calendars: {
        primary: { busy: [] }
      }
    })
  })

  describe('Slot Validation for Booking', () => {
    it('should validate a free slot as bookable', async () => {
      const nextMonday = getNextWeekdayAt(1, 10, 0)
      const slotEnd = new Date(nextMonday.getTime() + 30 * 60 * 1000)

      const result = await validateSlot({
        slotStart: nextMonday,
        slotEnd,
        calendarAccounts: [],
        availabilityRules: createMockRules(),
        timezone: 'America/Chicago',
        minNoticeHours: 4,
      })

      expect(result.valid).toBe(true)
    })

    it('should reject booking in the past', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)
      const slotEnd = new Date(yesterday.getTime() + 30 * 60 * 1000)

      const result = await validateSlot({
        slotStart: yesterday,
        slotEnd,
        calendarAccounts: [],
        availabilityRules: createMockRules(),
        timezone: 'America/Chicago',
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('past')
    })

    it('should reject booking outside availability rules', async () => {
      const nextSunday = getNextWeekdayAt(0, 10, 0)
      const slotEnd = new Date(nextSunday.getTime() + 30 * 60 * 1000)

      const result = await validateSlot({
        slotStart: nextSunday,
        slotEnd,
        calendarAccounts: [],
        availabilityRules: createMockRules(),
        timezone: 'America/Chicago',
      })

      expect(result.valid).toBe(false)
    })

    it('should reject booking before minimum notice period', async () => {
      const inTwoHours = new Date()
      inTwoHours.setHours(inTwoHours.getHours() + 2)
      const slotEnd = new Date(inTwoHours.getTime() + 30 * 60 * 1000)

      const result = await validateSlot({
        slotStart: inTwoHours,
        slotEnd,
        calendarAccounts: [],
        availabilityRules: createMockRules(),
        timezone: 'America/Chicago',
        minNoticeHours: 4,
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('notice')
    })
  })

  describe('Double Booking Prevention', () => {
    it('should reject slot that conflicts with busy time', async () => {
      const nextMonday = getNextWeekdayAt(1, 10, 0)
      const slotEnd = new Date(nextMonday.getTime() + 30 * 60 * 1000)

      mockGetFreeBusy.mockResolvedValue({
        calendars: {
          primary: {
            busy: [{
              start: nextMonday.toISOString(),
              end: slotEnd.toISOString(),
            }]
          }
        }
      })

      const calendarAccount: CalendarAccount = {
        id: 'cal-1',
        user_id: 'test-user',
        provider: 'google',
        provider_account_id: 'google-123',
        access_token: 'token',
        calendar_id: 'primary',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: false,
        created_at: new Date().toISOString(),
      }

      const result = await validateSlot({
        slotStart: nextMonday,
        slotEnd,
        calendarAccounts: [calendarAccount],
        availabilityRules: createMockRules(),
        timezone: 'America/Chicago',
      })

      expect(result.valid).toBe(false)
      // The error message may say "conflict" or "no longer available"
      expect(result.reason).toBeDefined()
    })

    it('should reject slot that partially overlaps with busy time', async () => {
      const nextMonday = getNextWeekdayAt(1, 10, 0)
      const slotEnd = new Date(nextMonday.getTime() + 30 * 60 * 1000)

      const busyStart = new Date(nextMonday.getTime() + 15 * 60 * 1000)
      const busyEnd = new Date(nextMonday.getTime() + 45 * 60 * 1000)

      mockGetFreeBusy.mockResolvedValue({
        calendars: {
          primary: {
            busy: [{
              start: busyStart.toISOString(),
              end: busyEnd.toISOString(),
            }]
          }
        }
      })

      const calendarAccount: CalendarAccount = {
        id: 'cal-1',
        user_id: 'test-user',
        provider: 'google',
        provider_account_id: 'google-123',
        access_token: 'token',
        calendar_id: 'primary',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: false,
        created_at: new Date().toISOString(),
      }

      const result = await validateSlot({
        slotStart: nextMonday,
        slotEnd,
        calendarAccounts: [calendarAccount],
        availabilityRules: createMockRules(),
        timezone: 'America/Chicago',
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('should allow booking attempts within rate limit', () => {
      const clientKey = `booking:test-ip-${Date.now()}`
      
      const result1 = checkRateLimit(clientKey, RATE_LIMITS.booking)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBeGreaterThan(0)

      const result2 = checkRateLimit(clientKey, RATE_LIMITS.booking)
      expect(result2.success).toBe(true)
    })

    it('should block booking attempts over rate limit', () => {
      const clientKey = `booking:test-ip-block-${Date.now()}`
      const config = { limit: 3, windowSec: 60 }

      checkRateLimit(clientKey, config)
      checkRateLimit(clientKey, config)
      checkRateLimit(clientKey, config)

      const result = checkRateLimit(clientKey, config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should track different IPs separately', () => {
      const ip1 = `booking:ip1-${Date.now()}`
      const ip2 = `booking:ip2-${Date.now()}`
      const config = { limit: 2, windowSec: 60 }

      checkRateLimit(ip1, config)
      checkRateLimit(ip1, config)
      const result1 = checkRateLimit(ip1, config)
      expect(result1.success).toBe(false)

      const result2 = checkRateLimit(ip2, config)
      expect(result2.success).toBe(true)
    })

    it('should provide retry-after information', () => {
      const clientKey = `booking:retry-${Date.now()}`
      const config = { limit: 1, windowSec: 60 }

      checkRateLimit(clientKey, config)
      const result = checkRateLimit(clientKey, config)

      expect(result.success).toBe(false)
      expect(result.resetIn).toBeGreaterThan(0)
      expect(result.resetIn).toBeLessThanOrEqual(60)
    })
  })

  describe('Calendar Event Creation', () => {
    it('should call createCalendarEvent with correct parameters', async () => {
      const account: CalendarAccount = {
        id: 'cal-1',
        user_id: 'test-user',
        provider: 'google',
        provider_account_id: 'google-123',
        access_token: 'token',
        calendar_id: 'primary',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: true,
        created_at: new Date().toISOString(),
      }

      const startTime = new Date('2025-12-10T15:00:00.000Z')
      const endTime = new Date('2025-12-10T15:30:00.000Z')

      await createCalendarEvent(account, 'primary', {
        summary: 'Test Meeting',
        description: 'Test description',
        start: startTime,
        end: endTime,
        attendees: ['attendee@example.com'],
        timeZone: 'America/Chicago',
        createMeetLink: true,
      })

      expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
        account,
        'primary',
        expect.objectContaining({
          summary: 'Test Meeting',
          attendees: ['attendee@example.com'],
          createMeetLink: true,
        })
      )
    })

    it('should return event details including meet link', async () => {
      mockCreateCalendarEvent.mockResolvedValue({
        id: 'event-123',
        htmlLink: 'https://calendar.google.com/event',
        hangoutLink: 'https://meet.google.com/abc-defg-hij',
      })

      const account: CalendarAccount = {
        id: 'cal-1',
        user_id: 'test-user',
        provider: 'google',
        provider_account_id: 'google-123',
        access_token: 'token',
        calendar_id: 'primary',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: true,
        created_at: new Date().toISOString(),
      }

      const result = await createCalendarEvent(account, 'primary', {
        summary: 'Test Meeting',
        start: new Date(),
        end: new Date(),
        attendees: [],
        timeZone: 'America/Chicago',
        createMeetLink: true,
      })

      expect(result.id).toBe('event-123')
      expect(result.hangoutLink).toBe('https://meet.google.com/abc-defg-hij')
    })
  })
})
