import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkRateLimit, getClientId, RATE_LIMITS } from '@/lib/rateLimit'
import {
  checkName,
  escapeHtml,
  isDisposableEmail,
  isSameOrigin,
  isValidEmail,
  MIN_FORM_FILL_MS,
  normalizeEmail,
} from '@/lib/spamGuard'

// Lazy initialize Resend to avoid build-time errors
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Bots retry when they get an error, so anything we classify as spam gets the
 * same 200 a real signup gets. Nothing is sent and nothing is recorded.
 */
function silentlyDrop(reason: string, clientId: string) {
  console.warn(`[beta-signup] dropped (${reason}) from ${clientId}`)
  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const clientId = getClientId(request)

  try {
    // Browser-only endpoint: a POST with no matching Origin is not from the site
    if (!isSameOrigin(request)) {
      return silentlyDrop('bad-origin', clientId)
    }

    // Abuse ceiling. Deliberately generous: this only stops hammering, it is
    // not the signup budget, so spam cannot use it up on behalf of real people.
    const burst = checkRateLimit(`beta-signup-burst:${clientId}`, RATE_LIMITS.betaSignupBurst)
    if (!burst.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': burst.resetIn.toString() } }
      )
    }

    const body = await request.json()
    const {
      email: rawEmail,
      name: rawName,
      company: honeypot,
      elapsedMs,
    }: {
      email?: unknown
      name?: unknown
      company?: unknown
      elapsedMs?: unknown
    } = body

    // Hidden field that only an automated filler would populate
    if (typeof honeypot === 'string' && honeypot.trim() !== '') {
      return silentlyDrop('honeypot', clientId)
    }

    // Submitted faster than a person can type. Missing value passes, so a stale
    // cached client does not lock real people out.
    if (typeof elapsedMs === 'number' && elapsedMs >= 0 && elapsedMs < MIN_FORM_FILL_MS) {
      return silentlyDrop('too-fast', clientId)
    }

    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (rawName !== undefined && rawName !== null && typeof rawName !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    const email = rawEmail.trim()
    const name = typeof rawName === 'string' ? rawName.trim() : ''

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const nameCheck = checkName(name)
    if (nameCheck.spam) {
      return silentlyDrop(nameCheck.reason ?? 'name', clientId)
    }

    if (isDisposableEmail(email)) {
      return silentlyDrop('disposable-email', clientId)
    }

    // Past this point the request looks human, so it spends the signup budget
    const perIp = checkRateLimit(`beta-signup:${clientId}`, RATE_LIMITS.betaSignup)
    if (!perIp.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': perIp.resetIn.toString() } }
      )
    }

    // Site-wide brake so a flood cannot burn the sending domain's reputation
    const global = checkRateLimit('beta-signup:global', RATE_LIMITS.betaSignupGlobal)
    if (!global.success) {
      return silentlyDrop('global-cap', clientId)
    }

    // Last check before sending. It marks the address as seen, so it has to run
    // after every gate that could still reject, or a rejected request would
    // lock the address out of a later retry.
    const perEmail = checkRateLimit(
      `beta-signup-email:${normalizeEmail(email)}`,
      RATE_LIMITS.betaSignupEmail
    )
    if (!perEmail.success) {
      return silentlyDrop('duplicate-email', clientId)
    }

    const safeEmail = escapeHtml(email)
    const safeName = name ? escapeHtml(name) : ''

    const resend = getResend()

    // Send notification email to you
    await resend.emails.send({
      from: 'MeetWith <notifications@meetwith.dev>',
      to: 'neelbvora@gmail.com',
      subject: '🎉 New Beta Access Request - MeetWith',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">New Beta Access Request!</h2>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${safeEmail}</p>
            ${safeName ? `<p style="margin: 0;"><strong>Name:</strong> ${safeName}</p>` : ''}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Add them as a test user in Google Cloud Console:<br/>
            <a href="https://console.cloud.google.com/apis/credentials/consent" style="color: #7c3aed;">
              Google Cloud Console → OAuth consent screen → Test users
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            Sent from MeetWith beta signup form
          </p>
        </div>
      `,
    })

    // Send confirmation to the user
    await resend.emails.send({
      from: 'MeetWith <hello@meetwith.dev>',
      to: email,
      subject: 'Welcome to the MeetWith Beta! 🚀',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">You're on the list!</h2>
          <p>Thanks for your interest in MeetWith${safeName ? `, ${safeName}` : ''}!</p>
          <p>
            We're currently in private beta. I'll review your request and add you
            to the beta testers list shortly.
          </p>
          <p>
            Once you're added, you'll be able to sign in with your Google account
            and start scheduling meetings.
          </p>
          <p style="margin-top: 24px;">
            In the meantime, feel free to reply to this email if you have any questions!
          </p>
          <p style="margin-top: 24px;">
            Neel<br/>
            <a href="https://neelvora.com" style="color: #7c3aed;">neelvora.com</a>
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Beta signup error:', error)
    return NextResponse.json(
      { error: 'Failed to process signup' },
      { status: 500 }
    )
  }
}
