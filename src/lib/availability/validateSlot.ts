import type { AvailabilityRule, CalendarAccount } from '@/types'
import { getFreeBusy, type FreeBusyTimeSlot } from '../calendar/googleClient'

export interface ValidateSlotParams {
  slotStart: Date
  slotEnd: Date
  calendarAccounts: CalendarAccount[]
  availabilityRules: AvailabilityRule[]
  timezone: string
  minNoticeHours?: number
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Validate that a specific time slot is still available for booking
 * This is called right before confirming a booking to prevent double-bookings
 */
export async function validateSlot({
  slotStart,
  slotEnd,
  calendarAccounts,
  availabilityRules,
  timezone,
  minNoticeHours = 0,
}: ValidateSlotParams): Promise<ValidationResult> {
  const now = new Date()

  // Check minimum notice period
  if (minNoticeHours > 0) {
    const minNoticeTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000)
    if (slotStart < minNoticeTime) {
      return {
        valid: false,
        reason: `Bookings require at least ${minNoticeHours} hour(s) notice`,
      }
    }
  }

  // Check if slot is in the past
  if (slotStart < now) {
    return {
      valid: false,
      reason: 'This time slot is in the past',
    }
  }

  // Check if slot falls within user's availability rules
  const dayOfWeek = getDayOfWeekInTimezone(slotStart, timezone)
  const slotTimeStr = getTimeStringInTimezone(slotStart, timezone)
  const slotEndTimeStr = getTimeStringInTimezone(slotEnd, timezone)

  const applicableRule = availabilityRules.find(
    (rule) => rule.weekday === dayOfWeek && rule.is_active
  )

  if (!applicableRule) {
    return {
      valid: false,
      reason: 'This day is not available for bookings',
    }
  }

  // Check if slot is within the rule's time range
  if (slotTimeStr < applicableRule.start_time || slotEndTimeStr > applicableRule.end_time) {
    return {
      valid: false,
      reason: 'This time is outside of available hours',
    }
  }

  // Check for calendar conflicts
  const busyPeriods = await getBusyPeriods(calendarAccounts, slotStart, slotEnd)
  
  if (isSlotBusy(slotStart, slotEnd, busyPeriods)) {
    return {
      valid: false,
      reason: 'This time slot is no longer available',
    }
  }

  return { valid: true }
}

/**
 * Get the day of week (0=Sunday, 6=Saturday) for a date in a specific timezone
 */
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })
  const dayName = formatter.format(date)
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return dayMap[dayName] ?? 0
}

/**
 * Get a HH:MM time string for a date in a specific timezone
 */
function getTimeStringInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value || '00'
  const minute = parts.find((p) => p.type === 'minute')?.value || '00'
  return `${hour}:${minute}`
}

/**
 * Get busy periods from calendars for the slot's time range
 */
async function getBusyPeriods(
  accounts: CalendarAccount[],
  start: Date,
  end: Date
): Promise<FreeBusyTimeSlot[]> {
  const allBusy: FreeBusyTimeSlot[] = []

  for (const account of accounts) {
    if (!account.include_in_availability) continue

    const calendarId = account.calendar_id || 'primary'
    const freeBusy = await getFreeBusy(account, [calendarId], start, end)

    if (freeBusy?.calendars) {
      for (const calData of Object.values(freeBusy.calendars)) {
        if (calData.busy) {
          allBusy.push(...calData.busy)
        }
      }
    }
  }

  return allBusy
}

/**
 * Check if a slot overlaps with any busy period
 */
function isSlotBusy(
  slotStart: Date,
  slotEnd: Date,
  busyPeriods: FreeBusyTimeSlot[]
): boolean {
  const start = slotStart.getTime()
  const end = slotEnd.getTime()

  for (const busy of busyPeriods) {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()

    // Check for any overlap
    if (start < busyEnd && end > busyStart) {
      return true
    }
  }

  return false
}
