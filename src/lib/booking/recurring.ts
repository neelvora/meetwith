import { addDays, addWeeks, addMonths, isBefore, isAfter } from 'date-fns'
import type { RecurrenceConfig, RecurrenceType } from '@/types'

export interface RecurringSlot {
  start: Date
  end: Date
  index: number // 1-based series index
}

/**
 * Generate recurring time slots based on a recurrence configuration
 */
export function generateRecurringSlots(
  firstSlotStart: Date,
  firstSlotEnd: Date,
  recurrence: RecurrenceConfig,
  timezone: string,
  maxOccurrences: number = 52 // Cap at 1 year of weekly meetings
): RecurringSlot[] {
  const slots: RecurringSlot[] = []
  const durationMs = firstSlotEnd.getTime() - firstSlotStart.getTime()
  
  // Determine how many occurrences to generate
  let targetCount: number
  let endDate: Date | null = null
  
  switch (recurrence.endType) {
    case 'count':
      targetCount = Math.min(recurrence.count || 4, maxOccurrences)
      break
    case 'date':
      if (!recurrence.endDate) {
        targetCount = 4
      } else {
        endDate = new Date(recurrence.endDate)
        targetCount = maxOccurrences
      }
      break
    case 'never':
      targetCount = maxOccurrences
      break
    default:
      targetCount = 4
  }
  
  // First slot is always included
  slots.push({
    start: firstSlotStart,
    end: firstSlotEnd,
    index: 1,
  })
  
  let currentDate = firstSlotStart
  let occurrenceCount = 1
  
  while (occurrenceCount < targetCount) {
    const nextDate = getNextOccurrence(currentDate, recurrence, timezone)
    
    if (!nextDate) break
    
    // Check end date constraint
    if (endDate && isAfter(nextDate, endDate)) {
      break
    }
    
    occurrenceCount++
    
    slots.push({
      start: nextDate,
      end: new Date(nextDate.getTime() + durationMs),
      index: occurrenceCount,
    })
    
    currentDate = nextDate
  }
  
  return slots
}

/**
 * Get the next occurrence date based on recurrence type
 */
function getNextOccurrence(
  currentDate: Date,
  recurrence: RecurrenceConfig,
  timezone: string
): Date | null {
  switch (recurrence.type) {
    case 'daily':
      return addDays(currentDate, 1)
      
    case 'weekly':
      if (recurrence.days && recurrence.days.length > 0) {
        // Find next occurrence on one of the specified days
        return getNextWeeklyOccurrence(currentDate, recurrence.days)
      }
      // Default: same day next week
      return addWeeks(currentDate, 1)
      
    case 'biweekly':
      return addWeeks(currentDate, 2)
      
    case 'monthly':
      return addMonths(currentDate, 1)
      
    default:
      return null
  }
}

/**
 * Get the next occurrence for weekly recurrence with specific days
 */
function getNextWeeklyOccurrence(
  currentDate: Date,
  days: number[]
): Date {
  const currentDay = currentDate.getDay()
  
  // Sort days for easier processing
  const sortedDays = [...days].sort((a, b) => a - b)
  
  // Find the next day in the same week
  for (const day of sortedDays) {
    if (day > currentDay) {
      // This day is later in the week
      const daysToAdd = day - currentDay
      return addDays(currentDate, daysToAdd)
    }
  }
  
  // No more days this week, go to first day of next week
  const firstDay = sortedDays[0]
  const daysUntilNextWeek = 7 - currentDay + firstDay
  return addDays(currentDate, daysUntilNextWeek)
}

/**
 * Validate a recurrence configuration
 */
export function validateRecurrenceConfig(config: RecurrenceConfig): { valid: boolean; error?: string } {
  if (!config.type) {
    return { valid: false, error: 'Recurrence type is required' }
  }
  
  const validTypes: RecurrenceType[] = ['daily', 'weekly', 'biweekly', 'monthly']
  if (!validTypes.includes(config.type)) {
    return { valid: false, error: 'Invalid recurrence type' }
  }
  
  if (config.type === 'weekly' && config.days) {
    if (!Array.isArray(config.days) || config.days.length === 0) {
      return { valid: false, error: 'Weekly recurrence requires at least one day' }
    }
    
    for (const day of config.days) {
      if (typeof day !== 'number' || day < 0 || day > 6) {
        return { valid: false, error: 'Invalid day value (must be 0-6)' }
      }
    }
  }
  
  if (!config.endType) {
    return { valid: false, error: 'Recurrence end type is required' }
  }
  
  if (config.endType === 'count') {
    if (!config.count || config.count < 1 || config.count > 52) {
      return { valid: false, error: 'Count must be between 1 and 52' }
    }
  }
  
  if (config.endType === 'date') {
    if (!config.endDate) {
      return { valid: false, error: 'End date is required for date-based recurrence' }
    }
    
    const endDate = new Date(config.endDate)
    if (isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid end date' }
    }
    
    if (isBefore(endDate, new Date())) {
      return { valid: false, error: 'End date must be in the future' }
    }
  }
  
  return { valid: true }
}

/**
 * Get human-readable description of recurrence
 */
export function describeRecurrence(config: RecurrenceConfig): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  let frequency: string
  switch (config.type) {
    case 'daily':
      frequency = 'Every day'
      break
    case 'weekly':
      if (config.days && config.days.length > 0) {
        const daysList = config.days.map(d => dayNames[d]).join(', ')
        frequency = `Every week on ${daysList}`
      } else {
        frequency = 'Every week'
      }
      break
    case 'biweekly':
      frequency = 'Every 2 weeks'
      break
    case 'monthly':
      frequency = 'Every month'
      break
    default:
      frequency = 'Custom'
  }
  
  let ending: string
  switch (config.endType) {
    case 'count':
      ending = `for ${config.count} occurrences`
      break
    case 'date':
      ending = config.endDate ? `until ${new Date(config.endDate).toLocaleDateString()}` : ''
      break
    case 'never':
      ending = 'indefinitely'
      break
    default:
      ending = ''
  }
  
  return `${frequency}${ending ? ', ' + ending : ''}`
}
