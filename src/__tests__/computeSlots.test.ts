import { describe, it, expect } from 'vitest'
import { computeAvailableSlots } from '@/lib/availability/computeSlots'
import type { AvailabilityRule, CalendarAccount } from '@/types'

/**
 * Tests for the actual computeSlots implementation
 * These tests verify the timezone handling in slot generation
 */

describe('computeAvailableSlots - Timezone Bug', () => {
  const mockAvailabilityRules: AvailabilityRule[] = [
    { id: '1', user_id: 'test', name: 'Default', weekday: 1, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '2', user_id: 'test', name: 'Default', weekday: 2, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '3', user_id: 'test', name: 'Default', weekday: 3, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '4', user_id: 'test', name: 'Default', weekday: 4, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
    { id: '5', user_id: 'test', name: 'Default', weekday: 5, start_time: '09:00', end_time: '17:00', is_active: true, created_at: '' },
  ]

  it('should generate slots starting at 9:00 AM Chicago time, NOT 9:00 AM UTC', async () => {
    // Monday, Dec 8, 2025
    const startDate = new Date('2025-12-08T00:00:00.000Z')
    const endDate = new Date('2025-12-08T23:59:59.000Z')

    const slots = await computeAvailableSlots({
      userId: 'test',
      calendarAccounts: [], // No calendars - just check slot generation
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
      dateRange: { start: startDate, end: endDate },
      slotDuration: 30,
      minNoticeHours: 0, // Disable min notice for testing
    })

    // Get the first available slot
    const availableSlots = slots.filter(s => s.available)
    
    if (availableSlots.length === 0) {
      throw new Error('No available slots generated')
    }

    const firstSlot = availableSlots[0]
    
    // Convert first slot to Chicago time
    const firstSlotChicagoTime = firstSlot.start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago',
    })

    console.log('First slot UTC:', firstSlot.start.toISOString())
    console.log('First slot Chicago:', firstSlotChicagoTime)

    // EXPECTED: 9:00 AM (Chicago time)
    // BUG: Shows 3:00 AM or similar (because 9:00 UTC = 3:00 AM Chicago)
    expect(firstSlotChicagoTime).toBe('9:00 AM')
  })

  it('should generate last slot at 4:30 PM Chicago time for 30-min meetings', async () => {
    const startDate = new Date('2025-12-08T00:00:00.000Z')
    const endDate = new Date('2025-12-08T23:59:59.000Z')

    const slots = await computeAvailableSlots({
      userId: 'test',
      calendarAccounts: [],
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
      dateRange: { start: startDate, end: endDate },
      slotDuration: 30,
      minNoticeHours: 0,
    })

    const availableSlots = slots.filter(s => s.available)
    const lastSlot = availableSlots[availableSlots.length - 1]

    const lastSlotChicagoTime = lastSlot.start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago',
    })

    console.log('Last slot UTC:', lastSlot.start.toISOString())
    console.log('Last slot Chicago:', lastSlotChicagoTime)

    // Last slot should start at 4:30 PM so meeting ends at 5:00 PM
    expect(lastSlotChicagoTime).toBe('4:30 PM')
  })

  it('should generate exactly 16 slots for 9 AM - 5 PM with 30-min duration', async () => {
    const startDate = new Date('2025-12-08T00:00:00.000Z')
    const endDate = new Date('2025-12-08T23:59:59.000Z')

    const slots = await computeAvailableSlots({
      userId: 'test',
      calendarAccounts: [],
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
      dateRange: { start: startDate, end: endDate },
      slotDuration: 30,
      minNoticeHours: 0,
    })

    const availableSlots = slots.filter(s => s.available)
    
    // 8 hours (9 AM to 5 PM) / 30 min = 16 slots
    console.log('Number of slots:', availableSlots.length)
    console.log('Slot times:', availableSlots.map(s => 
      s.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true, 
        timeZone: 'America/Chicago' 
      })
    ))

    expect(availableSlots.length).toBe(16)
  })

  it('should NOT generate slots at 4:30 AM Chicago', async () => {
    const startDate = new Date('2025-12-08T00:00:00.000Z')
    const endDate = new Date('2025-12-08T23:59:59.000Z')

    const slots = await computeAvailableSlots({
      userId: 'test',
      calendarAccounts: [],
      availabilityRules: mockAvailabilityRules,
      timezone: 'America/Chicago',
      dateRange: { start: startDate, end: endDate },
      slotDuration: 30,
      minNoticeHours: 0,
    })

    const availableSlots = slots.filter(s => s.available)
    
    // Check that no slot is at 4:30 AM, 5:00 AM, etc.
    const earlyMorningSlots = availableSlots.filter(s => {
      const hour = s.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: false, 
        timeZone: 'America/Chicago' 
      })
      const hourNum = parseInt(hour)
      return hourNum < 9
    })

    console.log('Early morning slots (should be 0):', earlyMorningSlots.length)
    if (earlyMorningSlots.length > 0) {
      console.log('Early slots:', earlyMorningSlots.map(s => 
        s.start.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true, 
          timeZone: 'America/Chicago' 
        })
      ))
    }

    expect(earlyMorningSlots.length).toBe(0)
  })
})
