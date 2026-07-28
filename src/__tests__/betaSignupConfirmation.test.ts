import { describe, it, expect } from 'vitest'
import { createConfirmationToken, hashToken } from '@/lib/betaSignups'
import { resolveBaseUrl } from '@/lib/baseUrl'
import {
  confirmationEmail,
  flaggedNotificationEmail,
  notificationEmail,
  welcomeEmail,
} from '@/lib/email/betaSignup'

describe('confirmation tokens', () => {
  it('produces a 256-bit hex token', () => {
    const token = createConfirmationToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('never repeats a token', () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => createConfirmationToken())
    )
    expect(tokens.size).toBe(500)
  })

  it('hashes deterministically so a link can be looked up', () => {
    const token = createConfirmationToken()
    expect(hashToken(token)).toBe(hashToken(token))
  })

  it('stores something that is not the token itself', () => {
    const token = createConfirmationToken()
    const hash = hashToken(token)
    expect(hash).not.toBe(token)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('gives different hashes for different tokens', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'))
  })
})

describe('resolveBaseUrl', () => {
  const requestWithHost = (host: string) =>
    new Request('https://example.invalid/api/beta-signup/confirm', {
      headers: { host },
    })

  it('prefers the configured base url over the request Host header', () => {
    const previous = process.env.APP_BASE_URL
    process.env.APP_BASE_URL = 'https://www.meetwith.dev'
    try {
      // Host is attacker-controlled, so a confirmation link must not follow it
      expect(resolveBaseUrl(requestWithHost('evil.example'))).toBe(
        'https://www.meetwith.dev'
      )
    } finally {
      process.env.APP_BASE_URL = previous
    }
  })

  it('falls back to the Host header for local development', () => {
    const appBase = process.env.APP_BASE_URL
    const nextAuth = process.env.NEXTAUTH_URL
    delete process.env.APP_BASE_URL
    delete process.env.NEXTAUTH_URL
    try {
      expect(resolveBaseUrl(requestWithHost('localhost:3000'))).toBe(
        'http://localhost:3000'
      )
    } finally {
      if (appBase) process.env.APP_BASE_URL = appBase
      if (nextAuth) process.env.NEXTAUTH_URL = nextAuth
    }
  })
})

describe('beta signup emails', () => {
  const NASTY = '<img src=x onerror=alert(1)>'

  it('escapes the name in every template', () => {
    const bodies = [
      confirmationEmail(NASTY, 'https://www.meetwith.dev/confirm?token=abc'),
      notificationEmail('a@example.com', NASTY),
      flaggedNotificationEmail('a@example.com', NASTY, ['machine-generated-name']),
      welcomeEmail(NASTY),
    ]

    for (const body of bodies) {
      expect(body).not.toContain('<img src=x')
      expect(body).toContain('&lt;img src=x')
    }
  })

  it('escapes the email address in the notification templates', () => {
    const bodies = [
      notificationEmail('<b>a@example.com</b>', 'Neel'),
      flaggedNotificationEmail('<b>a@example.com</b>', 'Neel', ['reason']),
    ]

    for (const body of bodies) {
      expect(body).not.toContain('<b>a@example.com</b>')
      expect(body).toContain('&lt;b&gt;')
    }
  })

  it('puts the confirm link in the confirmation email', () => {
    const url = 'https://www.meetwith.dev/api/beta-signup/confirm?token=deadbeef'
    expect(confirmationEmail('Neel', url)).toContain(url)
  })

  it('tells a non-requester that ignoring the email is enough', () => {
    const body = confirmationEmail('', 'https://example.com/x').toLowerCase()
    expect(body).toContain('ignore this email')
    expect(body).toContain('not on any list')
  })

  it('makes clear on the flagged notice that nothing was sent to the address', () => {
    const body = flaggedNotificationEmail('a@example.com', 'Qbvbsrc', [
      'machine-generated-name',
    ])
    expect(body).toContain('No email was sent to this address')
    expect(body).toContain('machine-generated-name')
  })
})
