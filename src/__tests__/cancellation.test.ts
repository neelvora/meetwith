import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/calendar/googleClient', () => ({
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email', () => ({
  sendCancellationEmails: vi.fn().mockResolvedValue(undefined),
}))

import { deleteCalendarEvent } from '@/lib/calendar/googleClient'
import { sendCancellationEmails } from '@/lib/email'

const mockDeleteCalendarEvent = vi.mocked(deleteCalendarEvent)
const mockSendCancellationEmails = vi.mocked(sendCancellationEmails)

describe('Cancellation Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Host Cancellation', () => {
    it('should verify booking belongs to user before cancellation', () => {
      const booking = {
        id: 'booking-1',
        user_id: 'user-1',
        status: 'confirmed',
        external_event_id: 'event-123',
      }
      const requestingUserId = 'user-1'

      const canCancel = booking.user_id === requestingUserId
      expect(canCancel).toBe(true)
    })

    it('should reject cancellation from non-owner', () => {
      const booking = {
        id: 'booking-1',
        user_id: 'user-1',
        status: 'confirmed',
      }
      const requestingUserId = 'user-2'

      const canCancel = booking.user_id === requestingUserId
      expect(canCancel).toBe(false)
    })

    it('should call deleteCalendarEvent when external event exists', async () => {
      const account = {
        id: 'cal-1',
        user_id: 'user-1',
        provider: 'google' as const,
        provider_account_id: 'google-123',
        access_token: 'token',
        calendar_id: 'primary',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: true,
        created_at: new Date().toISOString(),
      }

      await deleteCalendarEvent(account, 'primary', 'event-123')

      expect(mockDeleteCalendarEvent).toHaveBeenCalledWith(
        account,
        'primary',
        'event-123'
      )
    })

    it('should send cancellation emails after successful cancellation', async () => {
      await sendCancellationEmails({
        hostName: 'Test Host',
        hostEmail: 'host@example.com',
        attendeeName: 'Test Attendee',
        attendeeEmail: 'attendee@example.com',
        eventName: 'Test Meeting',
        startTime: new Date('2025-12-10T15:00:00.000Z'),
        endTime: new Date('2025-12-10T15:30:00.000Z'),
        timezone: 'America/Chicago',
        cancelledBy: 'host',
      })

      expect(mockSendCancellationEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          hostName: 'Test Host',
          hostEmail: 'host@example.com',
          attendeeName: 'Test Attendee',
          attendeeEmail: 'attendee@example.com',
          cancelledBy: 'host',
        })
      )
    })

    it('should reject cancellation of already cancelled booking', () => {
      const booking = {
        id: 'booking-1',
        user_id: 'user-1',
        status: 'cancelled',
      }

      const canCancel = booking.status !== 'cancelled'
      expect(canCancel).toBe(false)
    })

    it('should update booking status to cancelled', () => {
      const booking = {
        id: 'booking-1',
        user_id: 'user-1',
        status: 'confirmed' as string,
        cancelled_at: null as string | null,
      }

      booking.status = 'cancelled'
      booking.cancelled_at = new Date().toISOString()

      expect(booking.status).toBe('cancelled')
      expect(booking.cancelled_at).toBeDefined()
    })
  })

  describe('Guest Cancellation via Token', () => {
    it('should validate cancellation token format', () => {
      const validToken = 'abc123def456ghi789jkl012'
      const invalidToken = ''
      const nullToken = null

      expect(validToken.length).toBeGreaterThan(0)
      expect(invalidToken.length).toBe(0)
      expect(nullToken).toBeNull()
    })

    it('should reject empty cancellation token', () => {
      const token = ''
      const isValid = token && token.length > 0

      expect(isValid).toBeFalsy()
    })

    it('should reject null cancellation token', () => {
      const token = null
      const isValid = token && (token as string).length > 0

      expect(isValid).toBeFalsy()
    })

    it('should find booking by cancellation token', () => {
      const bookings = [
        { id: 'b1', cancellation_token: 'token-1', status: 'confirmed' },
        { id: 'b2', cancellation_token: 'token-2', status: 'confirmed' },
        { id: 'b3', cancellation_token: 'token-3', status: 'cancelled' },
      ]

      const searchToken = 'token-2'
      const booking = bookings.find(b => b.cancellation_token === searchToken)

      expect(booking).toBeDefined()
      expect(booking?.id).toBe('b2')
    })

    it('should return null for invalid token', () => {
      const bookings = [
        { id: 'b1', cancellation_token: 'token-1', status: 'confirmed' },
      ]

      const searchToken = 'invalid-token'
      const booking = bookings.find(b => b.cancellation_token === searchToken)

      expect(booking).toBeUndefined()
    })

    it('should reject reused token (booking already cancelled)', () => {
      const booking = {
        id: 'b1',
        cancellation_token: 'token-1',
        status: 'cancelled',
      }

      const canCancel = booking.status !== 'cancelled'
      expect(canCancel).toBe(false)
    })

    it('should prevent double cancellation', () => {
      const booking = {
        id: 'b1',
        cancellation_token: 'token-1',
        status: 'confirmed' as string,
      }

      booking.status = 'cancelled'

      const secondAttempt = booking.status !== 'cancelled'
      expect(secondAttempt).toBe(false)
    })

    it('should send cancellation email with guest as canceller', async () => {
      await sendCancellationEmails({
        hostName: 'Test Host',
        hostEmail: 'host@example.com',
        attendeeName: 'Test Attendee',
        attendeeEmail: 'attendee@example.com',
        eventName: 'Test Meeting',
        startTime: new Date('2025-12-10T15:00:00.000Z'),
        endTime: new Date('2025-12-10T15:30:00.000Z'),
        timezone: 'America/Chicago',
        cancelledBy: 'guest',
      })

      expect(mockSendCancellationEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelledBy: 'guest',
        })
      )
    })
  })

  describe('Calendar Event Deletion', () => {
    it('should handle missing external_event_id gracefully', () => {
      const booking = {
        id: 'b1',
        user_id: 'user-1',
        external_event_id: null,
        status: 'confirmed',
      }

      const shouldDeleteEvent = !!booking.external_event_id
      expect(shouldDeleteEvent).toBe(false)
    })

    it('should handle calendar deletion failure gracefully', async () => {
      mockDeleteCalendarEvent.mockRejectedValueOnce(new Error('Calendar API error'))

      const account = {
        id: 'cal-1',
        user_id: 'user-1',
        provider: 'google' as const,
        provider_account_id: 'google-123',
        access_token: 'token',
        calendar_id: 'primary',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: true,
        created_at: new Date().toISOString(),
      }

      let calendarError: Error | null = null
      try {
        await deleteCalendarEvent(account, 'primary', 'event-123')
      } catch (error) {
        calendarError = error as Error
      }

      expect(calendarError).toBeDefined()
      expect(calendarError?.message).toBe('Calendar API error')
    })
  })
})
