import type { AvailabilityRule, CalendarAccount } from '@/types'
import { getFreeBusy, type FreeBusyTimeSlot } from '../calendar/googleClient'

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export interface ComputeSlotsParams {
  userId: string
  calendarAccounts: CalendarAccount[]
  availabilityRules: AvailabilityRule[]
  timezone: string
  dateRange: {
    start: Date
    end: Date
  }
  slotDuration: number // minutes
  minNoticeHours?: number
  bufferBefore?: number
  bufferAfter?: number
}

/**
 * Get all busy periods from connected calendars
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

  // Sort and merge overlapping busy periods
  return mergeBusyPeriods(allBusy)
}

/**
 * Merge overlapping or adjacent busy periods
 */
function mergeBusyPeriods(periods: FreeBusyTimeSlot[]): FreeBusyTimeSlot[] {
  if (periods.length === 0) return []

  // Sort by start time
  const sorted = [...periods].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const merged: FreeBusyTimeSlot[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    const lastEnd = new Date(last.end).getTime()
    const currentStart = new Date(current.start).getTime()

    if (currentStart <= lastEnd) {
      // Overlapping or adjacent, merge them
      const currentEnd = new Date(current.end).getTime()
      if (currentEnd > lastEnd) {
        last.end = current.end
      }
    } else {
      // No overlap, add as new period
      merged.push(current)
    }
  }

  return merged
}

/**
 * Check if a slot overlaps with any busy period
 */
function isSlotBusy(
  slotStart: Date,
  slotEnd: Date,
  busyPeriods: FreeBusyTimeSlot[]
): boolean {
  for (const busy of busyPeriods) {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    const start = slotStart.getTime()
    const end = slotEnd.getTime()

    // Check for any overlap
    if (start < busyEnd && end > busyStart) {
      return true
    }
  }
  return false
}

/**
 * Create a Date object for a specific time in a specific timezone
 * This handles the timezone conversion properly regardless of server timezone
 */
function createTimeInTimezone(
  date: Date,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Get the date components in the target timezone
  const dateStr = date.toLocaleDateString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  // Parse the date parts
  const [month, day, year] = dateStr.split('/').map(Number)
  
  // Create an ISO string for the desired time in the target timezone
  // We need to calculate what UTC time corresponds to this local time
  
  // Create a date string in the format the timezone expects
  const targetTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  
  // Create a date in UTC first, then adjust for timezone
  const utcDate = new Date(targetTimeStr + 'Z')
  
  // Get the offset for this timezone at this date
  // We do this by comparing what time it shows in the timezone vs UTC
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  
  // Get the timezone offset by creating a reference date and checking the difference
  const refDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
  const refFormatted = formatter.format(refDate)
  const [refHour] = refFormatted.split(':').map(Number)
  const offsetHours = refHour - 12 // Difference from UTC noon
  
  // Adjust the UTC time by the offset to get the correct moment
  // If timezone is UTC-6, we need to ADD 6 hours to the local time to get UTC
  const adjustedUtc = new Date(utcDate.getTime() - offsetHours * 60 * 60 * 1000)
  
  return adjustedUtc
}

/**
 * Generate all possible slots for a day based on availability rules
 */
function generateDaySlots(
  date: Date,
  rules: AvailabilityRule[],
  slotDuration: number,
  timezone: string
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = []
  
  // Get the day of week in the target timezone
  const weekdayStr = date.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' })
  const dayOfWeek = 
    weekdayStr === 'Sun' ? 0 :
    weekdayStr === 'Mon' ? 1 :
    weekdayStr === 'Tue' ? 2 :
    weekdayStr === 'Wed' ? 3 :
    weekdayStr === 'Thu' ? 4 :
    weekdayStr === 'Fri' ? 5 : 6

  // Find rules that apply to this day
  const dayRules = rules.filter((r) => r.weekday === dayOfWeek && r.is_active)

  for (const rule of dayRules) {
    const [startHour, startMinute] = rule.start_time.split(':').map(Number)
    const [endHour, endMinute] = rule.end_time.split(':').map(Number)

    // Create start and end times for this rule in the correct timezone
    const ruleStart = createTimeInTimezone(date, startHour, startMinute, timezone)
    const ruleEnd = createTimeInTimezone(date, endHour, endMinute, timezone)

    // Generate slots within this time window
    let slotStart = new Date(ruleStart)

    while (slotStart.getTime() + slotDuration * 60000 <= ruleEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)
      slots.push({ start: new Date(slotStart), end: slotEnd })
      slotStart = slotEnd
    }
  }

  return slots
}

/**
 * Compute available time slots for booking
 * 
 * This is the main function that:
 * 1. Fetches busy times from all connected calendars
 * 2. Generates potential slots from availability rules
 * 3. Filters out busy slots and slots in the past
 * 4. Returns final available slots
 */
export async function computeAvailableSlots(
  params: ComputeSlotsParams
): Promise<TimeSlot[]> {
  const {
    calendarAccounts,
    availabilityRules,
    timezone,
    dateRange,
    slotDuration,
    minNoticeHours = 0,
    bufferBefore = 0,
    bufferAfter = 0,
  } = params

  // Get all busy periods from calendars
  const busyPeriods = await getBusyPeriods(
    calendarAccounts,
    dateRange.start,
    dateRange.end
  )

  const slots: TimeSlot[] = []
  const now = new Date()
  const minNoticeTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000)

  // Iterate through each day in the range
  const currentDate = new Date(dateRange.start)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= dateRange.end) {
    // Generate potential slots for this day
    const daySlots = generateDaySlots(
      currentDate,
      availabilityRules,
      slotDuration,
      timezone
    )

    for (const slot of daySlots) {
      // Apply buffer times for conflict checking
      const bufferStart = new Date(slot.start.getTime() - bufferBefore * 60000)
      const bufferEnd = new Date(slot.end.getTime() + bufferAfter * 60000)

      // Check if slot meets minimum notice requirement
      if (slot.start < minNoticeTime) {
        slots.push({ ...slot, available: false })
        continue
      }

      // Check if slot is busy (with buffers)
      const isBusy = isSlotBusy(bufferStart, bufferEnd, busyPeriods)

      slots.push({ ...slot, available: !isBusy })
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return slots
}

/**
 * Get only available slots (convenience function)
 */
export async function getAvailableSlots(
  params: ComputeSlotsParams
): Promise<TimeSlot[]> {
  const allSlots = await computeAvailableSlots(params)
  return allSlots.filter((slot) => slot.available)
}

/**
 * Format a slot for display
 */
export function formatSlot(slot: TimeSlot, timezone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  const startStr = slot.start.toLocaleTimeString('en-US', options)
  const endStr = slot.end.toLocaleTimeString('en-US', options)

  return `${startStr} - ${endStr}`
}

/**
 * Group slots by date for display
 */
export function groupSlotsByDate(
  slots: TimeSlot[],
  timezone: string
): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>()

  for (const slot of slots) {
    const dateKey = slot.start.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)!.push(slot)
  }

  return grouped
}
