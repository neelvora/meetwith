import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * AI Helper Tests
 * 
 * These tests verify the behavior of AI helper functions:
 * - Proper error handling when API key is missing
 * - Function signatures and expected behavior
 * 
 * Note: Testing actual OpenAI API calls requires mocking at the network level.
 * For unit tests, we focus on error handling and isAIEnabled behavior.
 */

describe('AI Helper Tests', () => {
  const originalEnv = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalEnv
    vi.resetModules()
  })

  describe('isAIEnabled', () => {
    it('should return false when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { isAIEnabled } = await import('@/lib/ai/client')
      expect(isAIEnabled()).toBe(false)
    })

    it('should return false when OPENAI_API_KEY is empty', async () => {
      process.env.OPENAI_API_KEY = ''
      vi.resetModules()

      const { isAIEnabled } = await import('@/lib/ai/client')
      expect(isAIEnabled()).toBe(false)
    })
  })

  describe('generateMeetingDescription', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { generateMeetingDescription } = await import('@/lib/ai/client')

      await expect(
        generateMeetingDescription({
          title: 'Test Meeting',
          durationMinutes: 30,
        })
      ).rejects.toThrow('OpenAI API key not configured')
    })

    it('should accept valid input parameters', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { generateMeetingDescription } = await import('@/lib/ai/client')

      const inputWithContext = {
        title: 'Product Demo',
        durationMinutes: 45,
        context: 'For enterprise clients',
      }

      await expect(generateMeetingDescription(inputWithContext))
        .rejects.toThrow('OpenAI API key not configured')
    })
  })

  describe('generateFollowUpEmail', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { generateFollowUpEmail } = await import('@/lib/ai/client')

      await expect(
        generateFollowUpEmail({
          hostName: 'John',
          attendeeName: 'Jane',
          meetingTitle: 'Demo',
        })
      ).rejects.toThrow('OpenAI API key not configured')
    })

    it('should accept valid input with optional meetingSummary', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { generateFollowUpEmail } = await import('@/lib/ai/client')

      const inputWithSummary = {
        hostName: 'Alice',
        attendeeName: 'Bob',
        meetingTitle: 'Project Discussion',
        meetingSummary: 'Discussed project timeline and next steps',
      }

      await expect(generateFollowUpEmail(inputWithSummary))
        .rejects.toThrow('OpenAI API key not configured')
    })
  })

  describe('suggestTimeWindow', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { suggestTimeWindow } = await import('@/lib/ai/client')

      await expect(
        suggestTimeWindow({
          timezone: 'America/Chicago',
          currentAvailability: [
            { day: 'Monday', startTime: '09:00', endTime: '17:00' },
          ],
        })
      ).rejects.toThrow('OpenAI API key not configured')
    })

    it('should accept valid input with optional eventTypes', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { suggestTimeWindow } = await import('@/lib/ai/client')

      const inputWithEventTypes = {
        timezone: 'America/Chicago',
        currentAvailability: [
          { day: 'Monday', startTime: '09:00', endTime: '17:00' },
        ],
        eventTypes: [
          { name: 'Quick Chat', duration: 15 },
          { name: 'Full Meeting', duration: 60 },
        ],
      }

      await expect(suggestTimeWindow(inputWithEventTypes))
        .rejects.toThrow('OpenAI API key not configured')
    })

    it('should accept empty availability', async () => {
      delete process.env.OPENAI_API_KEY
      vi.resetModules()

      const { suggestTimeWindow } = await import('@/lib/ai/client')

      await expect(suggestTimeWindow({
        timezone: 'America/Chicago',
        currentAvailability: [],
      })).rejects.toThrow('OpenAI API key not configured')
    })
  })
})
