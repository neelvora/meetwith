import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TimeSlotPicker from '@/app/[username]/TimeSlotPicker'

const eventType = { id: 'evt-1', slug: 'intro', name: 'Intro call', duration: 30 }

function respondWith(body: Record<string, unknown>) {
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => body,
  }) as unknown as typeof fetch
}

function renderPicker() {
  render(
    <TimeSlotPicker
      username="neel"
      eventType={eventType}
      onBack={vi.fn()}
      onBook={vi.fn()}
    />
  )
}

describe('TimeSlotPicker when booking is paused', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('shows the reason instead of the picker', async () => {
    respondWith({
      slots: {},
      paused: true,
      reason: 'Booking is paused while a calendar reconnects.',
    })
    renderPicker()

    expect(
      await screen.findByText('Booking is paused while a calendar reconnects.')
    ).toBeInTheDocument()
    // The empty-week wording would read as "the host is busy", which is the
    // wrong thing to tell somebody when we simply cannot see the calendar
    expect(screen.queryByText('No available times this week.')).toBeNull()
  })

  it('still shows the picker on a week that is merely empty', async () => {
    respondWith({ slots: {}, totalAvailable: 0 })
    renderPicker()

    expect(
      await screen.findByText('No available times this week.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Booking is paused while a calendar reconnects.')
    ).toBeNull()
  })
})
