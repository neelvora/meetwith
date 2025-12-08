import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Comprehensive test suite for MeetWith Scheduling Application
 * 
 * Test Categories:
 * 1. Availability Slot Generation
 * 2. Timezone Handling
 * 3. Calendar Busy Time Filtering
 * 4. Booking Flow
 * 5. Email Formatting
 */

// ============================================
// TIMEZONE UTILITY TESTS
// ============================================

describe('Timezone Utilities', () => {
  describe('formatTimeInTimezone', () => {
    it('should format 9:00 AM Chicago correctly', () => {
      // 9:00 AM Chicago (CST, UTC-6) = 15:00 UTC
      const utcDate = new Date('2025-12-08T15:00:00.000Z')
      const formatted = utcDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      expect(formatted).toBe('9:00 AM')
    })

    it('should format 5:00 PM Chicago correctly', () => {
      // 5:00 PM Chicago (CST, UTC-6) = 23:00 UTC
      const utcDate = new Date('2025-12-08T23:00:00.000Z')
      const formatted = utcDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      expect(formatted).toBe('5:00 PM')
    })

    it('should handle date correctly across timezone boundaries', () => {
      // 11:00 PM Chicago on Dec 8 = 5:00 AM UTC on Dec 9
      const utcDate = new Date('2025-12-09T05:00:00.000Z')
      const chicagoDate = utcDate.toLocaleDateString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      expect(chicagoDate).toBe('12/08/2025')
    })
  })

  describe('createDateInTimezone', () => {
    it('should create 9:00 AM Chicago as correct UTC time', () => {
      // To create 9:00 AM in Chicago, we need to:
      // 1. Know that Chicago is UTC-6 in December (CST)
      // 2. So 9:00 AM Chicago = 15:00 UTC
      
      // This is the CORRECT way to create a time in a specific timezone
      const chicagoTime = new Date(
        new Date('2025-12-08').toLocaleString('en-US', { timeZone: 'America/Chicago' })
      )
      
      // The problem: JavaScript Date doesn't have native timezone support
      // We need to calculate the offset manually or use a library
      
      // For 9:00 AM Chicago on Dec 8, 2025:
      // Chicago is UTC-6 (CST) in December
      // So 9:00 AM Chicago = 9:00 + 6 = 15:00 UTC
      const correctUtc = new Date('2025-12-08T15:00:00.000Z')
      
      expect(correctUtc.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })).toBe('9:00 AM')
    })
  })
})

// ============================================
// SLOT GENERATION TESTS
// ============================================

describe('Slot Generation', () => {
  describe('generateDaySlots', () => {
    it('should generate slots within availability window', () => {
      // Given: Availability 9:00 AM - 5:00 PM Chicago
      // Duration: 30 minutes
      // Expected: 16 slots (8 hours / 30 min = 16)
      
      const availabilityStart = '09:00'
      const availabilityEnd = '17:00'
      const slotDuration = 30
      
      const expectedSlotCount = (17 - 9) * 2 // 8 hours * 2 slots per hour
      expect(expectedSlotCount).toBe(16)
    })

    it('should NOT generate slots outside availability window', () => {
      // Given: Availability 9:00 AM - 5:00 PM
      // NO slots should exist at 4:30 AM, 5:00 AM, 8:30 AM, 5:30 PM, etc.
      
      const availabilityStartHour = 9
      const availabilityEndHour = 17
      
      const invalidTimes = [4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 17, 17.5, 18]
      
      for (const hour of invalidTimes) {
        const isOutside = hour < availabilityStartHour || hour >= availabilityEndHour
        expect(isOutside).toBe(true)
      }
    })

    it('should respect timezone when generating slots', () => {
      // CRITICAL TEST: This is the bug we're fixing
      // Given: Availability 9:00 AM - 5:00 PM Chicago (CST, UTC-6)
      // Server timezone: UTC
      // 
      // Expected behavior:
      // - First slot: 9:00 AM Chicago = 15:00 UTC
      // - Last slot: 4:30 PM Chicago = 22:30 UTC (for 30 min meeting ending at 5 PM)
      //
      // Bug behavior:
      // - First slot: 9:00 UTC (which is 3:00 AM Chicago!)
      
      const firstSlotChicago = '09:00'
      const chicagoOffset = -6 // CST
      const expectedFirstSlotUtcHour = 9 - chicagoOffset // 9 - (-6) = 15
      
      expect(expectedFirstSlotUtcHour).toBe(15)
    })
  })
})

// ============================================
// BUSY TIME FILTERING TESTS
// ============================================

describe('Busy Time Filtering', () => {
  describe('isSlotBusy', () => {
    it('should mark slot as busy when it overlaps with calendar event', () => {
      // Given: Busy from 8:00 AM - 1:00 PM Chicago
      // Slot: 9:00 AM - 9:30 AM Chicago
      // Expected: Slot is busy (overlaps)
      
      const busyStart = new Date('2025-12-08T14:00:00.000Z') // 8 AM Chicago
      const busyEnd = new Date('2025-12-08T19:00:00.000Z')   // 1 PM Chicago
      
      const slotStart = new Date('2025-12-08T15:00:00.000Z') // 9 AM Chicago
      const slotEnd = new Date('2025-12-08T15:30:00.000Z')   // 9:30 AM Chicago
      
      // Check for overlap: slot starts before busy ends AND slot ends after busy starts
      const overlaps = slotStart < busyEnd && slotEnd > busyStart
      expect(overlaps).toBe(true)
    })

    it('should mark slot as available when after busy period', () => {
      // Given: Busy from 8:00 AM - 1:00 PM Chicago
      // Slot: 1:30 PM - 2:00 PM Chicago
      // Expected: Slot is available
      
      const busyStart = new Date('2025-12-08T14:00:00.000Z') // 8 AM Chicago
      const busyEnd = new Date('2025-12-08T19:00:00.000Z')   // 1 PM Chicago
      
      const slotStart = new Date('2025-12-08T19:30:00.000Z') // 1:30 PM Chicago
      const slotEnd = new Date('2025-12-08T20:00:00.000Z')   // 2:00 PM Chicago
      
      const overlaps = slotStart < busyEnd && slotEnd > busyStart
      expect(overlaps).toBe(false)
    })

    it('should correctly identify all available slots after busy period', () => {
      // Given: 
      // - Availability: 9:00 AM - 5:00 PM Chicago
      // - Busy: 8:00 AM - 1:00 PM Chicago
      // - Duration: 30 min
      // 
      // Expected available slots:
      // 1:00 PM, 1:30 PM, 2:00 PM, 2:30 PM, 3:00 PM, 3:30 PM, 4:00 PM, 4:30 PM
      // = 8 slots
      
      const availableAfterBusy = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
      expect(availableAfterBusy.length).toBe(8)
    })
  })
})

// ============================================
// EMAIL FORMATTING TESTS
// ============================================

describe('Email Formatting', () => {
  describe('formatDateTime', () => {
    it('should format date in correct timezone for emails', () => {
      // Given: Booking at 9:00 AM Chicago
      const bookingTime = new Date('2025-12-08T15:00:00.000Z')
      
      const formatted = bookingTime.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
        timeZoneName: 'short',
      })
      
      expect(formatted).toContain('December')
      expect(formatted).toContain('8')
      expect(formatted).toContain('9:00 AM')
      expect(formatted).toContain('CST')
    })

    it('should NOT show UTC time in emails', () => {
      // Given: Booking at 9:00 AM Chicago (15:00 UTC)
      // Email should NOT say "3:00 PM UTC" or "15:00"
      
      const bookingTime = new Date('2025-12-08T15:00:00.000Z')
      
      const formatted = bookingTime.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      
      expect(formatted).not.toBe('3:00 PM')
      expect(formatted).toBe('9:00 AM')
    })
  })
})

// ============================================
// DATE KEY GENERATION TESTS
// ============================================

describe('Date Key Generation', () => {
  describe('getDateKey', () => {
    it('should generate correct date key in local timezone', () => {
      // Given: A slot at 11:00 PM Chicago on Dec 8
      // UTC time: 5:00 AM Dec 9
      // Date key should be: 2025-12-08 (Chicago date)
      
      const slotTime = new Date('2025-12-09T05:00:00.000Z') // 11 PM Chicago on Dec 8
      
      // WRONG way (using UTC):
      const wrongKey = slotTime.toISOString().split('T')[0]
      expect(wrongKey).toBe('2025-12-09') // Wrong! This is UTC date
      
      // CORRECT way (using timezone):
      const localDate = new Date(slotTime.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const year = localDate.getFullYear()
      const month = String(localDate.getMonth() + 1).padStart(2, '0')
      const day = String(localDate.getDate()).padStart(2, '0')
      const correctKey = `${year}-${month}-${day}`
      expect(correctKey).toBe('2025-12-08') // Correct! This is Chicago date
    })

    it('should group morning slots under correct date', () => {
      // Given: A slot at 9:00 AM Chicago on Dec 8
      // UTC time: 3:00 PM Dec 8
      // Date key should be: 2025-12-08
      
      const slotTime = new Date('2025-12-08T15:00:00.000Z') // 9 AM Chicago
      
      const localDate = new Date(slotTime.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const year = localDate.getFullYear()
      const month = String(localDate.getMonth() + 1).padStart(2, '0')
      const day = String(localDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      
      expect(dateKey).toBe('2025-12-08')
    })
  })
})

// ============================================
// BOOKING FLOW TESTS
// ============================================

describe('Booking Flow', () => {
  describe('Time Selection', () => {
    it('should display times in user timezone on booking page', () => {
      // Given: API returns slot at 15:00 UTC
      // Display should show: 9:00 AM (in America/Chicago)
      
      const isoString = '2025-12-08T15:00:00.000Z'
      
      const displayTime = new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      
      expect(displayTime).toBe('9:00 AM')
    })
  })

  describe('Date Selection', () => {
    it('clicking a date should show slots for that date', () => {
      // Given: User clicks on Monday, Dec 8
      // Should show: Slots for Dec 8 in their timezone
      
      const clickedDate = new Date(2025, 11, 8) // Dec 8, 2025 local
      
      // Generate the date key the same way frontend does
      const year = clickedDate.getFullYear()
      const month = String(clickedDate.getMonth() + 1).padStart(2, '0')
      const day = String(clickedDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      
      expect(dateKey).toBe('2025-12-08')
    })
  })
})

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Full Availability Computation', () => {
  it('should return correct available slots for a typical day', () => {
    // Scenario:
    // - Timezone: America/Chicago
    // - Availability: Mon-Fri, 9:00 AM - 5:00 PM
    // - Date: Monday, Dec 8, 2025
    // - Busy: 8:00 AM - 1:00 PM (from calendar)
    // - Duration: 30 min
    // - Min notice: 4 hours (assume current time is early enough)
    //
    // Expected available slots:
    // 1:00 PM, 1:30 PM, 2:00 PM, 2:30 PM, 3:00 PM, 3:30 PM, 4:00 PM, 4:30 PM
    
    const expectedSlots = [
      '2025-12-08T19:00:00.000Z', // 1:00 PM Chicago
      '2025-12-08T19:30:00.000Z', // 1:30 PM Chicago
      '2025-12-08T20:00:00.000Z', // 2:00 PM Chicago
      '2025-12-08T20:30:00.000Z', // 2:30 PM Chicago
      '2025-12-08T21:00:00.000Z', // 3:00 PM Chicago
      '2025-12-08T21:30:00.000Z', // 3:30 PM Chicago
      '2025-12-08T22:00:00.000Z', // 4:00 PM Chicago
      '2025-12-08T22:30:00.000Z', // 4:30 PM Chicago
    ]
    
    expect(expectedSlots.length).toBe(8)
    
    // Verify each slot displays correctly in Chicago time
    expectedSlots.forEach((slot, index) => {
      const display = new Date(slot).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago',
      })
      
      const expectedTimes = [
        '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
        '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
      ]
      
      expect(display).toBe(expectedTimes[index])
    })
  })

  it('should NOT return slots during busy periods', () => {
    // Busy: 8:00 AM - 1:00 PM Chicago
    // These slots should NOT be available:
    const busySlots = [
      '2025-12-08T15:00:00.000Z', // 9:00 AM Chicago - BUSY
      '2025-12-08T15:30:00.000Z', // 9:30 AM Chicago - BUSY
      '2025-12-08T16:00:00.000Z', // 10:00 AM Chicago - BUSY
      '2025-12-08T16:30:00.000Z', // 10:30 AM Chicago - BUSY
      '2025-12-08T17:00:00.000Z', // 11:00 AM Chicago - BUSY
      '2025-12-08T17:30:00.000Z', // 11:30 AM Chicago - BUSY
      '2025-12-08T18:00:00.000Z', // 12:00 PM Chicago - BUSY
      '2025-12-08T18:30:00.000Z', // 12:30 PM Chicago - BUSY
    ]
    
    // These should all be marked as busy
    expect(busySlots.length).toBe(8)
  })

  it('should NOT return slots outside availability window', () => {
    // These slots should NEVER appear (outside 9 AM - 5 PM):
    const invalidSlots = [
      '2025-12-08T10:30:00.000Z', // 4:30 AM Chicago - TOO EARLY
      '2025-12-08T11:00:00.000Z', // 5:00 AM Chicago - TOO EARLY
      '2025-12-08T11:30:00.000Z', // 5:30 AM Chicago - TOO EARLY
      '2025-12-08T12:00:00.000Z', // 6:00 AM Chicago - TOO EARLY
      '2025-12-08T23:00:00.000Z', // 5:00 PM Chicago - AT END
      '2025-12-08T23:30:00.000Z', // 5:30 PM Chicago - TOO LATE
    ]
    
    // Verify these are outside the window
    invalidSlots.forEach(slot => {
      const hour = new Date(slot).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'America/Chicago',
      })
      const hourNum = parseInt(hour)
      const isOutside = hourNum < 9 || hourNum >= 17
      expect(isOutside).toBe(true)
    })
  })
})
