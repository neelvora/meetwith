import { describe, it, expect } from 'vitest'
import { calendarDisconnectedEmail } from '@/lib/email/calendarHealth'

describe('calendarDisconnectedEmail', () => {
  const details = {
    accountEmail: 'host@example.com',
    disconnectedAt: new Date('2026-09-07T21:57:00Z'),
    calendarsUrl: 'https://www.meetwith.dev/dashboard/calendars',
  }

  it('names the account that stopped working', () => {
    expect(calendarDisconnectedEmail(details)).toContain('host@example.com')
  })

  it('says when it stopped, so the gap can be judged', () => {
    const html = calendarDisconnectedEmail(details)
    expect(html).toContain('Disconnected since:')
    expect(html).toContain('September 7, 2026')
  })

  it('links to the dashboard page that actually reconnects', () => {
    expect(calendarDisconnectedEmail(details)).toContain(
      'href="https://www.meetwith.dev/dashboard/calendars"'
    )
  })

  it('escapes the account email rather than trusting it as markup', () => {
    const html = calendarDisconnectedEmail({
      ...details,
      accountEmail: '<script>alert(1)</script>@example.com',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
