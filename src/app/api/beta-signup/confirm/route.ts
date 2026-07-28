import { NextResponse } from 'next/server'
import { checkRateLimit, getClientId, RATE_LIMITS } from '@/lib/rateLimit'
import { confirmSignup } from '@/lib/betaSignups'
import { sendMail } from '@/lib/email/send'
import {
  BETA_NOTIFY_ADDRESS,
  notificationEmail,
  welcomeEmail,
} from '@/lib/email/betaSignup'
import { resolveBaseUrl } from '@/lib/baseUrl'

/**
 * Redeems the link from the confirmation email. This is the only path that puts
 * a signup in front of Neel, so an address reaches him only by proving it can
 * receive mail.
 */
export async function GET(request: Request) {
  const clientId = getClientId(request)
  const baseUrl = resolveBaseUrl(request)
  const landing = (state: string) =>
    NextResponse.redirect(`${baseUrl}/beta/confirmed?state=${state}`, 303)

  // Tokens are 256-bit, so this is not about guessing. It stops someone
  // hammering the endpoint to probe which links exist.
  const limit = checkRateLimit(`beta-confirm:${clientId}`, RATE_LIMITS.betaSignupBurst)
  if (!limit.success) {
    return landing('error')
  }

  try {
    const token = new URL(request.url).searchParams.get('token')
    const result = await confirmSignup(token)

    switch (result.status) {
      case 'confirmed':
        break
      case 'already-confirmed':
        return landing('already')
      case 'expired':
        return landing('expired')
      case 'not-found':
        return landing('invalid')
      case 'unavailable':
        return landing('error')
    }

    const { email, name } = result.signup

    // Notify first: if the welcome mail fails, Neel still learns about a real
    // signup, which is the part that must not be lost.
    await sendMail({
      from: 'MeetWith <notifications@meetwith.dev>',
      to: BETA_NOTIFY_ADDRESS,
      subject: '🎉 Confirmed Beta Access Request - MeetWith',
      html: notificationEmail(email, name ?? ''),
    })

    await sendMail({
      from: 'MeetWith <hello@meetwith.dev>',
      to: email,
      subject: 'Welcome to the MeetWith Beta! 🚀',
      html: welcomeEmail(name ?? ''),
    })

    console.log(`[beta-signup] confirmed ${email}`)
    return landing('confirmed')
  } catch (error) {
    console.error('Beta signup confirmation error:', error)
    return landing('error')
  }
}
