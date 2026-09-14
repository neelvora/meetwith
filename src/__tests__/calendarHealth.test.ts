import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calendarDisconnectedEmail } from '@/lib/email/calendarHealth'
import {
  BOOKING_PAUSED_REASON,
  computeAvailability,
  computeAvailableSlots,
} from '@/lib/availability/computeSlots'
import { validateSlot } from '@/lib/availability/validateSlot'
import type { AvailabilityRule, CalendarAccount } from '@/types'

vi.mock('@/lib/calendar/googleClient', () => ({
  getFreeBusy: vi.fn(),
}))

import { getFreeBusy } from '@/lib/calendar/googleClient'
const mockGetFreeBusy = vi.mocked(getFreeBusy)

function getNextWeekday(weekday: number): Date {
  const now = new Date()
  const daysUntil = (weekday - now.getDay() + 7) % 7 || 7
  const result = new Date(now)
  result.setDate(result.getDate() + daysUntil)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

function toEndOfDay(date: Date): Date {
  const result = new Date(date)
  result.setUTCHours(23, 59, 59, 999)
  return result
}

function createAccount(overrides: Partial<CalendarAccount> = {}): CalendarAccount {
  return {
    id: 'cal-1',
    user_id: 'test-user',
    provider: 'google',
    provider_account_id: 'google-123',
    account_email: 'host@example.com',
    access_token: 'token',
    calendar_id: 'primary',
    is_primary: true,
    include_in_availability: true,
    write_to_calendar: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const rules: AvailabilityRule[] = [1, 2, 3, 4, 5].map((weekday) => ({
  id: `rule-${weekday}`,
  user_id: 'test-user',
  name: 'Default',
  weekday,
  start_time: '09:00',
  end_time: '17:00',
  is_active: true,
  created_at: '',
}))

function paramsFor(accounts: CalendarAccount[]) {
  const day = getNextWeekday(1)
  return {
    userId: 'test-user',
    calendarAccounts: accounts,
    availabilityRules: rules,
    timezone: 'America/Chicago',
    dateRange: { start: day, end: toEndOfDay(day) },
    slotDuration: 30,
    minNoticeHours: 0,
  }
}

describe('availability when a calendar cannot be read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreeBusy.mockResolvedValue({ calendars: { primary: { busy: [] } } })
  })

  it('offers slots normally when the calendar reads back', async () => {
    const result = await computeAvailability(paramsFor([createAccount()]))

    expect(result.paused).toBe(false)
    expect(result.slots.some((slot) => slot.available)).toBe(true)
  })

  it('pauses rather than counting a disconnected account as free', async () => {
    const result = await computeAvailability(
      paramsFor([createAccount({ disconnected_at: '2026-09-07T21:57:00Z' })])
    )

    expect(result.paused).toBe(true)
    expect(result.reason).toBe(BOOKING_PAUSED_REASON)
    expect(result.slots).toHaveLength(0)
    // A disconnected account is never worth a network call
    expect(mockGetFreeBusy).not.toHaveBeenCalled()
  })

  it('pauses when the free/busy read fails', async () => {
    mockGetFreeBusy.mockResolvedValue(null)

    const result = await computeAvailability(paramsFor([createAccount()]))

    expect(result.paused).toBe(true)
    expect(result.slots).toHaveLength(0)
  })

  it('pauses when Google reports an error for the calendar', async () => {
    mockGetFreeBusy.mockResolvedValue({
      calendars: {
        primary: { busy: [], errors: [{ domain: 'global', reason: 'notFound' }] },
      },
    })

    const result = await computeAvailability(paramsFor([createAccount()]))

    expect(result.paused).toBe(true)
    expect(result.slots).toHaveLength(0)
  })

  it('still reads every other account when one is unreadable, so each dead one is recorded', async () => {
    mockGetFreeBusy.mockResolvedValue(null)

    const result = await computeAvailability(
      paramsFor([
        createAccount({ id: 'cal-dead-1' }),
        createAccount({ id: 'cal-dead-2' }),
        createAccount({ id: 'cal-3' }),
      ])
    )

    expect(result.paused).toBe(true)
    expect(mockGetFreeBusy).toHaveBeenCalledTimes(3)
  })

  it('ignores a broken account that is excluded from availability', async () => {
    const result = await computeAvailability(
      paramsFor([
        createAccount({
          include_in_availability: false,
          disconnected_at: '2026-09-07T21:57:00Z',
        }),
      ])
    )

    expect(result.paused).toBe(false)
    expect(result.slots.some((slot) => slot.available)).toBe(true)
  })

  it('returns an empty slot list from computeAvailableSlots when paused', async () => {
    mockGetFreeBusy.mockResolvedValue(null)

    await expect(
      computeAvailableSlots(paramsFor([createAccount()]))
    ).resolves.toEqual([])
  })
})

describe('calendarDisconnectedEmail', () => {
  const details = {
    accountEmail: 'host@example.com',
    disconnectedAt: new Date('2026-09-07T21:57:00Z'),
    calendarsUrl: 'https://www.meetwith.dev/dashboard/calendars',
  }

  it('names the account that stopped working', () => {
    expect(calendarDisconnectedEmail(details)).toContain('host@example.com')
  })

  it('says when it stopped, so the gap can be judged', () => {
    const html = calendarDisconnectedEmail(details)
    expect(html).toContain('Disconnected since:')
    expect(html).toContain('September 7, 2026')
  })

  it('links to the dashboard page that actually reconnects', () => {
    expect(calendarDisconnectedEmail(details)).toContain(
      'href="https://www.meetwith.dev/dashboard/calendars"'
    )
  })

  it('escapes the account email rather than trusting it as markup', () => {
    const html = calendarDisconnectedEmail({
      ...details,
      accountEmail: '<script>alert(1)</script>@example.com',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('booking-time validation when a calendar cannot be read', () => {
  function slotFor(accounts: CalendarAccount[]) {
    const day = getNextWeekday(1)
    const slotStart = new Date(day)
    slotStart.setUTCHours(16, 0, 0, 0) // 11:00 Central during daylight time
    const slotEnd = new Date(slotStart)
    slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + 30)
    return {
      slotStart,
      slotEnd,
      calendarAccounts: accounts,
      availabilityRules: rules,
      timezone: 'America/Chicago',
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreeBusy.mockResolvedValue({ calendars: { primary: { busy: [] } } })
  })

  it('accepts the slot when the calendar reads back free', async () => {
    const result = await validateSlot(slotFor([createAccount()]))

    expect(result.valid).toBe(true)
  })

  it('refuses the slot on a disconnected account without calling Google', async () => {
    const result = await validateSlot(
      slotFor([createAccount({ disconnected_at: '2026-09-07T21:57:00Z' })])
    )

    expect(result.valid).toBe(false)
    expect(result.reason).toBe(BOOKING_PAUSED_REASON)
    expect(mockGetFreeBusy).not.toHaveBeenCalled()
  })

  it('refuses the slot when the free/busy read fails', async () => {
    mockGetFreeBusy.mockResolvedValue(null)

    const result = await validateSlot(slotFor([createAccount()]))

    expect(result.valid).toBe(false)
    expect(result.reason).toBe(BOOKING_PAUSED_REASON)
  })

  it('refuses the slot when Google reports a calendar error', async () => {
    mockGetFreeBusy.mockResolvedValue({
      calendars: { primary: { busy: [], errors: [{ domain: 'global', reason: 'notFound' }] } },
    })

    const result = await validateSlot(slotFor([createAccount()]))

    expect(result.valid).toBe(false)
    expect(result.reason).toBe(BOOKING_PAUSED_REASON)
  })

  it('ignores a disconnected account that is excluded from availability', async () => {
    const result = await validateSlot(
      slotFor([
        createAccount({
          id: 'cal-2',
          disconnected_at: '2026-09-07T21:57:00Z',
          include_in_availability: false,
        }),
        createAccount(),
      ])
    )

    expect(result.valid).toBe(true)
  })
})
