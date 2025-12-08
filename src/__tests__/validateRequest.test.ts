/**
 * Tests for booking request validation
 */

import { describe, it, expect } from 'vitest'
import {
  validateBookingRequest,
  hasRequiredFields,
  isValidTimezone,
  sanitizeString,
} from '@/lib/booking/validateRequest'

describe('validateBookingRequest', () => {
  const validRequest = {
    username: 'testuser',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // +30 mins
    attendeeName: 'John Doe',
    attendeeEmail: 'john@example.com',
    attendeeTimezone: 'America/New_York',
  }

  // Helper to create a valid time on a slot boundary
  function createSlotTime(offsetMinutes: number): Date {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(now.getHours() + 24) // Tomorrow
    now.setMinutes(offsetMinutes)
    return now
  }

  describe('valid requests', () => {
    it('accepts a valid booking request', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)
      
      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toBeDefined()
    })

    it('accepts 15-minute duration', () => {
      const start = createSlotTime(15)
      const end = new Date(start.getTime() + 15 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('accepts 60-minute duration', () => {
      const start = createSlotTime(30)
      const end = new Date(start.getTime() + 60 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('accepts 120-minute duration', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 120 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('accepts optional eventTypeId as UUID', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        eventTypeId: '550e8400-e29b-41d4-a716-446655440000',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('missing required fields', () => {
    it('rejects missing username', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { username, ...request } = validRequest
      const result = validateBookingRequest(request)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('username') || e.includes('Username'))).toBe(true)
    })

    it('rejects missing startTime', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { startTime, ...request } = validRequest
      const result = validateBookingRequest(request)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('startTime'))).toBe(true)
    })

    it('rejects missing attendeeName', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { attendeeName, ...request } = validRequest
      const result = validateBookingRequest(request)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('attendeeName') || e.includes('Attendee name'))).toBe(true)
    })

    it('rejects missing attendeeEmail', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { attendeeEmail, ...request } = validRequest
      const result = validateBookingRequest(request)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('attendeeEmail') || e.includes('email'))).toBe(true)
    })
  })

  describe('invalid values', () => {
    it('rejects invalid email format', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendeeEmail: 'not-an-email',
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('email'))).toBe(true)
    })

    it('rejects email that is too long', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendeeEmail: 'a'.repeat(250) + '@example.com',
      })

      expect(result.valid).toBe(false)
    })

    it('rejects invalid datetime format', () => {
      const result = validateBookingRequest({
        ...validRequest,
        startTime: 'not-a-date',
      })

      expect(result.valid).toBe(false)
    })

    it('rejects end time before start time', () => {
      const start = createSlotTime(30)
      const end = new Date(start.getTime() - 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('End time'))).toBe(true)
    })

    it('rejects invalid UUID for eventTypeId', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        eventTypeId: 'not-a-uuid',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
    })

    it('rejects notes that are too long', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: 'x'.repeat(2001),
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('duration validation', () => {
    it('rejects 25-minute duration (not in valid list)', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 25 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('duration'))).toBe(true)
    })

    it('rejects 100-minute duration', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 100 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('slot granularity', () => {
    it('accepts start at :00', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('accepts start at :15', () => {
      const start = createSlotTime(15)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('accepts start at :30', () => {
      const start = createSlotTime(30)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('accepts start at :45', () => {
      const start = createSlotTime(45)
      const end = new Date(start.getTime() + 15 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })

    it('rejects start at :07', () => {
      const start = new Date()
      start.setHours(start.getHours() + 24)
      start.setMinutes(7, 0, 0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes(':00, :15, :30, or :45'))).toBe(true)
    })

    it('rejects start at :22', () => {
      const start = new Date()
      start.setHours(start.getHours() + 24)
      start.setMinutes(22, 0, 0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
    })
  })

  describe('future date limits', () => {
    it('rejects booking more than 90 days in future', () => {
      const start = new Date()
      start.setDate(start.getDate() + 91)
      start.setMinutes(0, 0, 0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('90 days'))).toBe(true)
    })

    it('accepts booking 89 days in future', () => {
      const start = new Date()
      start.setDate(start.getDate() + 89)
      start.setMinutes(0, 0, 0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('security validation', () => {
    it('rejects HTML in attendee name', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendeeName: '<script>alert("xss")</script>',
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid characters'))).toBe(true)
    })

    it('rejects javascript: in attendee name', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendeeName: 'javascript:alert("xss")',
      })

      expect(result.valid).toBe(false)
    })

    it('rejects script tags in notes', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: 'Hello <script>evil()</script>',
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid content'))).toBe(true)
    })

    it('accepts normal text with special characters', () => {
      const start = createSlotTime(0)
      const end = new Date(start.getTime() + 30 * 60 * 1000)

      const result = validateBookingRequest({
        ...validRequest,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendeeName: 'John O\'Connor-Smith',
        notes: 'Meeting about Q&A session (budget: $500)',
      })

      expect(result.valid).toBe(true)
    })
  })
})

describe('hasRequiredFields', () => {
  it('returns true when all required fields present', () => {
    expect(hasRequiredFields({
      username: 'test',
      startTime: 'time',
      endTime: 'time',
      attendeeName: 'name',
      attendeeEmail: 'email',
    })).toBe(true)
  })

  it('returns false when username missing', () => {
    expect(hasRequiredFields({
      startTime: 'time',
      endTime: 'time',
      attendeeName: 'name',
      attendeeEmail: 'email',
    })).toBe(false)
  })

  it('returns false when empty object', () => {
    expect(hasRequiredFields({})).toBe(false)
  })
})

describe('isValidTimezone', () => {
  it('accepts valid IANA timezone', () => {
    expect(isValidTimezone('America/New_York')).toBe(true)
    expect(isValidTimezone('Europe/London')).toBe(true)
    expect(isValidTimezone('Asia/Tokyo')).toBe(true)
    expect(isValidTimezone('UTC')).toBe(true)
  })

  it('rejects invalid timezone', () => {
    expect(isValidTimezone('Invalid/Timezone')).toBe(false)
    expect(isValidTimezone('fake')).toBe(false)
    expect(isValidTimezone('')).toBe(false)
  })
})

describe('sanitizeString', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeString('<script>')).toBe('&lt;script&gt;')
    expect(sanitizeString('"quoted"')).toBe('&quot;quoted&quot;')
    expect(sanitizeString("it's")).toBe('it&#x27;s')
  })

  it('leaves normal text unchanged', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World')
    expect(sanitizeString('test@example.com')).toBe('test@example.com')
  })
})
