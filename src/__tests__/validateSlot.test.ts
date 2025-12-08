import { describe, it, expect, vi } from 'vitest'
import { validateSlot } from '@/lib/availability/validateSlot'
import type { AvailabilityRule, CalendarAccount } from '@/types'

// Mock the Google Calendar API
vi.mock('@/lib/calendar/googleClient', () => ({
  getFreeBusy: vi.fn().mockResolvedValue({
    calendars: {
      primary: { busy: [] }
    }
  })
}))

describe('validateSlot', () => {
  const mockAvailabilityRules: AvailabilityRule[] = [
    { id: '1', user_id: 'test', name: 'Default', weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '2', user_id: 'test', name: 'Default', weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '3', user_id: 'test', name: 'Default', weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '4', user_id: 'test', name: 'Default', weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '5', user_id: 'test', name: 'Default', weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    // Weekend is inactive
    { id: '0', user_id: 'test', name: 'Default', weekday: 0, start_time: '09:00', end_time: '17:00', is_active: false, created_at: '' },
    { id: '6', user_id: 'test', name: 'Default', weekday: 6, start_time: '09:00', end_time: '17:00', is_active: false, created_at: '' },
  ]

  const mockCalendarAccounts: CalendarAccount[] = [] // Empty - no calendar integration for basic tests

  it('should reject slots in the past', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(10, 0, 0, 0)

    const slotEnd = new Date(yesterday)
    slotEnd.setMinutes(slotEnd.getMinutes() + 30)

    const result = await validateSlot({
      slotStart: yesterday,
      slotEnd,
      calendarAccounts: mockCalendarAccounts,
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toContain('past')
  })

  it('should reject slots that violate minimum notice', async () => {
    const inOneHour = new Date()
    inOneHour.setHours(inOneHour.getHours() + 1)

    const slotEnd = new Date(inOneHour)
    slotEnd.setMinutes(slotEnd.getMinutes() + 30)

    const result = await validateSlot({
      slotStart: inOneHour,
      slotEnd,
      calendarAccounts: mockCalendarAccounts,
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
      minNoticeHours: 4, // Require 4 hours notice
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toContain('notice')
  })

  it('should accept slots with sufficient notice', async () => {
    // Find the next Monday at 10 AM Chicago time
    const nextMonday = new Date()
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7) + 7) // At least a week out
    nextMonday.setHours(10, 0, 0, 0)

    const slotEnd = new Date(nextMonday)
    slotEnd.setMinutes(slotEnd.getMinutes() + 30)

    const result = await validateSlot({
      slotStart: nextMonday,
      slotEnd,
      calendarAccounts: mockCalendarAccounts,
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
      minNoticeHours: 4,
    })

    expect(result.valid).toBe(true)
  })

  it('should reject slots on unavailable days', async () => {
    // Find the next Sunday
    const nextSunday = new Date()
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) + 7) // At least a week out
    nextSunday.setHours(10, 0, 0, 0)

    const slotEnd = new Date(nextSunday)
    slotEnd.setMinutes(slotEnd.getMinutes() + 30)

    const result = await validateSlot({
      slotStart: nextSunday,
      slotEnd,
      calendarAccounts: mockCalendarAccounts,
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toContain('not available')
  })
})
