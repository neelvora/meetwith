import { NextResponse } from 'next/server'
import { checkRateLimit, getClientId, RATE_LIMITS } from '@/lib/rateLimit'
import {
  assessSignup,
  checkName,
  isDisposableEmail,
  isSameOrigin,
  isValidEmail,
  MIN_FORM_FILL_MS,
  normalizeEmail,
} from '@/lib/spamGuard'
import {
  TURNSTILE_TOKEN_FIELD,
  turnstileRejection,
  verifyTurnstile,
} from '@/lib/turnstile'
import { createPendingSignup } from '@/lib/betaSignups'
import { sendMail } from '@/lib/email/send'
import {
  BETA_NOTIFY_ADDRESS,
  confirmationEmail,
  flaggedNotificationEmail,
} from '@/lib/email/betaSignup'
import { resolveBaseUrl } from '@/lib/baseUrl'

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
    const turnstileToken = body?.[TURNSTILE_TOKEN_FIELD]

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

    // Hard gate. Unlike the heuristics above this returns a real error rather
    // than a silent success, because a person can legitimately fail it (expired
    // or already-redeemed token) and needs to be told so they can retry.
    const turnstile = await verifyTurnstile(turnstileToken, clientId)
    if (!turnstile.ok) {
      return turnstileRejection(turnstile, `beta-signup from ${clientId}`)
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

    // Caps confirmation emails per address. Runs after every gate that could
    // still reject, so a rejected request does not spend the address's budget.
    const perEmail = checkRateLimit(
      `beta-signup-email:${normalizeEmail(email)}`,
      RATE_LIMITS.betaSignupEmail
    )
    if (!perEmail.success) {
      return silentlyDrop('email-resend-cap', clientId)
    }

    // Fuzzy signals. These never reject: a flagged request is surfaced to the
    // inbox so a false positive can be rescued by hand, but no mail goes to the
    // address and nothing is recorded against it.
    const assessment = assessSignup(email, name)
    if (assessment.suspicious) {
      console.warn(
        `[beta-signup] flagged (${assessment.reasons.join(', ')}) from ${clientId}`
      )

      const flaggedQuota = checkRateLimit(
        'beta-signup:flagged',
        RATE_LIMITS.betaSignupFlagged
      )
      if (!flaggedQuota.success) {
        return silentlyDrop('flagged-quota', clientId)
      }

      await sendMail({
        from: 'MeetWith <notifications@meetwith.dev>',
        to: BETA_NOTIFY_ADDRESS,
        subject: '⚠️ Likely Spam Beta Request - MeetWith',
        html: flaggedNotificationEmail(email, name, assessment.reasons),
      })

      return NextResponse.json({ success: true })
    }

    // Double opt-in. Nothing reaches the inbox and nobody is on any list until
    // the address itself clicks the link, which is something a bomber cannot do
    // because they cannot read their victim's mail.
    const pending = await createPendingSignup(email, name)

    if (pending.status === 'unavailable') {
      return NextResponse.json(
        { error: 'Failed to process signup' },
        { status: 500 }
      )
    }

    // Say nothing about an address already being on the list. Answering that
    // truthfully would turn the form into a membership oracle.
    if (pending.status === 'already-confirmed') {
      console.warn(`[beta-signup] re-request for confirmed address from ${clientId}`)
      return NextResponse.json({ success: true })
    }

    const confirmUrl = `${resolveBaseUrl(request)}/api/beta-signup/confirm?token=${pending.token}`

    await sendMail({
      from: 'MeetWith <hello@meetwith.dev>',
      to: email,
      subject: 'Confirm your MeetWith beta request',
      html: confirmationEmail(name, confirmUrl),
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
