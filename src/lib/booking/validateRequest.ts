/**
 * Central validation for booking requests
 * Validates fields, duration, timing, and slot granularity before processing
 */

// Valid slot durations (in minutes) - must match event type options
const VALID_DURATIONS = [15, 30, 45, 60, 90, 120]

// Slot must start on these minute boundaries
const VALID_SLOT_MINUTES = [0, 15, 30, 45]

// Maximum booking window (days in future)
const MAX_FUTURE_DAYS = 90

// Email regex that handles most real-world addresses
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// UUID regex for eventTypeId validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BookingRequest {
  username: string
  eventTypeId?: string
  startTime: string
  endTime: string
  attendeeName: string
  attendeeEmail: string
  attendeeTimezone?: string
  notes?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  data?: BookingRequest
}

/**
 * Validate a booking request
 * - Validates all required fields
 * - Checks duration is a valid increment
 * - Ensures start time is on a valid slot boundary
 * - Ensures booking is not too far in the future
 * - Ensures end time is after start time
 */
export function validateBookingRequest(body: unknown): ValidationResult {
  const errors: string[] = []

  // Type guard
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid request body'] }
  }

  const data = body as Record<string, unknown>

  // Step 1: Validate required fields
  if (!data.username || typeof data.username !== 'string' || data.username.trim() === '') {
    errors.push('username: Username is required')
  }

  if (!data.startTime || typeof data.startTime !== 'string') {
    errors.push('startTime: Start time is required')
  }

  if (!data.endTime || typeof data.endTime !== 'string') {
    errors.push('endTime: End time is required')
  }

  if (!data.attendeeName || typeof data.attendeeName !== 'string' || data.attendeeName.trim() === '') {
    errors.push('attendeeName: Attendee name is required')
  } else if ((data.attendeeName as string).length > 200) {
    errors.push('attendeeName: Attendee name too long')
  }

  if (!data.attendeeEmail || typeof data.attendeeEmail !== 'string' || data.attendeeEmail.trim() === '') {
    errors.push('attendeeEmail: Attendee email is required')
  } else if ((data.attendeeEmail as string).length > 254) {
    errors.push('attendeeEmail: Email address too long')
  } else if (!EMAIL_REGEX.test(data.attendeeEmail as string)) {
    errors.push('attendeeEmail: Invalid email format')
  }

  // Step 2: Validate optional fields
  if (data.eventTypeId !== undefined && data.eventTypeId !== null) {
    if (typeof data.eventTypeId !== 'string' || !UUID_REGEX.test(data.eventTypeId)) {
      errors.push('eventTypeId: Invalid UUID format')
    }
  }

  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      errors.push('notes: Notes must be a string')
    } else if (data.notes.length > 2000) {
      errors.push('notes: Notes too long')
    }
  }

  // Early return if basic validation failed
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Step 3: Parse and validate dates
  const startTimeStr = data.startTime as string
  const endTimeStr = data.endTime as string

  const startTime = new Date(startTimeStr)
  const endTime = new Date(endTimeStr)

  if (isNaN(startTime.getTime())) {
    errors.push('startTime: Invalid date format')
  }
  if (isNaN(endTime.getTime())) {
    errors.push('endTime: Invalid date format')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Step 4: End time must be after start time
  if (endTime <= startTime) {
    errors.push('End time must be after start time')
  }

  // Step 5: Validate duration
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationMinutes = Math.round(durationMs / 60000)

  if (!VALID_DURATIONS.includes(durationMinutes)) {
    errors.push(`Invalid duration: ${durationMinutes} minutes. Valid durations: ${VALID_DURATIONS.join(', ')}`)
  }

  // Step 6: Validate slot granularity (must start on 0, 15, 30, or 45 minutes)
  const startMinutes = startTime.getMinutes()
  if (!VALID_SLOT_MINUTES.includes(startMinutes)) {
    errors.push(`Booking must start on :00, :15, :30, or :45. Got :${startMinutes.toString().padStart(2, '0')}`)
  }

  // Step 7: Booking cannot be too far in the future
  const maxFutureDate = new Date()
  maxFutureDate.setDate(maxFutureDate.getDate() + MAX_FUTURE_DAYS)

  if (startTime > maxFutureDate) {
    errors.push(`Booking cannot be more than ${MAX_FUTURE_DAYS} days in the future`)
  }

  // Step 8: Sanitize name (prevent injection attempts)
  if (/<[^>]*>|javascript:/i.test(data.attendeeName as string)) {
    errors.push('Invalid characters in attendee name')
  }

  if (data.notes && /<script/i.test(data.notes as string)) {
    errors.push('Invalid content in notes')
  }

  // Build validated data object
  const validatedData: BookingRequest = {
    username: (data.username as string).trim(),
    startTime: startTimeStr,
    endTime: endTimeStr,
    attendeeName: (data.attendeeName as string).trim(),
    attendeeEmail: (data.attendeeEmail as string).trim().toLowerCase(),
    eventTypeId: data.eventTypeId as string | undefined,
    attendeeTimezone: data.attendeeTimezone as string | undefined,
    notes: data.notes as string | undefined,
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? validatedData : undefined,
  }
}

/**
 * Quick validation for just the required fields
 * Used for early bailout before more expensive checks
 */
export function hasRequiredFields(body: Record<string, unknown>): boolean {
  return !!(
    body.username &&
    body.startTime &&
    body.endTime &&
    body.attendeeName &&
    body.attendeeEmail
  )
}

/**
 * Validate timezone string
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize a string for safe storage/display
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
