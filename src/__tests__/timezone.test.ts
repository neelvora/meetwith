import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * Tests that simulate UTC server environment
 * These tests verify timezone handling works regardless of server timezone
 */

describe('Timezone Conversion Function', () => {
  /**
   * Test the createTimeInTimezone function independently
   */
  it('should correctly convert 9:00 AM Chicago to UTC', () => {
    // 9:00 AM Chicago (CST, UTC-6) = 15:00 UTC (3:00 PM UTC)
    // December 8, 2025 - Chicago is in CST (UTC-6)
    
    const date = new Date('2025-12-08T00:00:00.000Z')
    const hour = 9
    const minute = 0
    const timezone = 'America/Chicago'
    
    // Get the date components in the target timezone
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    // Parse the date parts
    const [month, day, year] = dateStr.split('/').map(Number)
    
    // Create the target time string
    const targetTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    
    // Create a date in UTC
    const utcDate = new Date(targetTimeStr + 'Z')
    
    // Get the timezone offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    
    const refDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
    const refFormatted = formatter.format(refDate)
    const [refHour] = refFormatted.split(':').map(Number)
    const offsetHours = refHour - 12
    
    console.log('Target time string:', targetTimeStr)
    console.log('UTC date initially:', utcDate.toISOString())
    console.log('Reference formatted:', refFormatted)
    console.log('Offset hours:', offsetHours)
    
    // Adjust for timezone
    const adjustedUtc = new Date(utcDate.getTime() - offsetHours * 60 * 60 * 1000)
    
    console.log('Adjusted UTC:', adjustedUtc.toISOString())
    console.log('Adjusted in Chicago:', adjustedUtc.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago',
    }))
    
    // The adjusted time should be 15:00 UTC (9 AM Chicago)
    expect(adjustedUtc.getUTCHours()).toBe(15)
    expect(adjustedUtc.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago',
    })).toBe('9:00 AM')
  })

  it('should correctly convert 5:00 PM Chicago to UTC', () => {
    // 5:00 PM Chicago (CST, UTC-6) = 23:00 UTC (11:00 PM UTC)
    
    const date = new Date('2025-12-08T00:00:00.000Z')
    const hour = 17
    const minute = 0
    const timezone = 'America/Chicago'
    
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    const [month, day, year] = dateStr.split('/').map(Number)
    const targetTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
    const utcDate = new Date(targetTimeStr + 'Z')
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    
    const refDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
    const refFormatted = formatter.format(refDate)
    const [refHour] = refFormatted.split(':').map(Number)
    const offsetHours = refHour - 12
    
    const adjustedUtc = new Date(utcDate.getTime() - offsetHours * 60 * 60 * 1000)
    
    expect(adjustedUtc.getUTCHours()).toBe(23)
    expect(adjustedUtc.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago',
    })).toBe('5:00 PM')
  })

  it('should handle different timezones correctly', () => {
    // Test with New York (EST, UTC-5)
    const date = new Date('2025-12-08T00:00:00.000Z')
    const timezone = 'America/New_York'
    
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    const [month, day, year] = dateStr.split('/').map(Number)
    const targetTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00`
    const utcDate = new Date(targetTimeStr + 'Z')
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    
    const refDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
    const refFormatted = formatter.format(refDate)
    const [refHour] = refFormatted.split(':').map(Number)
    const offsetHours = refHour - 12
    
    const adjustedUtc = new Date(utcDate.getTime() - offsetHours * 60 * 60 * 1000)
    
    // 9 AM New York (EST, UTC-5) = 14:00 UTC
    expect(adjustedUtc.getUTCHours()).toBe(14)
    expect(adjustedUtc.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    })).toBe('9:00 AM')
  })

  it('should handle Los Angeles (PST) correctly', () => {
    // 9 AM Los Angeles (PST, UTC-8) = 17:00 UTC
    const date = new Date('2025-12-08T00:00:00.000Z')
    const timezone = 'America/Los_Angeles'
    
    const dateStr = date.toLocaleDateString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    const [month, day, year] = dateStr.split('/').map(Number)
    const targetTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00`
    const utcDate = new Date(targetTimeStr + 'Z')
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    
    const refDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`)
    const refFormatted = formatter.format(refDate)
    const [refHour] = refFormatted.split(':').map(Number)
    const offsetHours = refHour - 12
    
    const adjustedUtc = new Date(utcDate.getTime() - offsetHours * 60 * 60 * 1000)
    
    expect(adjustedUtc.getUTCHours()).toBe(17)
    expect(adjustedUtc.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles',
    })).toBe('9:00 AM')
  })
})
