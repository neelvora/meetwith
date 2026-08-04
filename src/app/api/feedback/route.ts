import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientId } from '@/lib/rateLimit'
import { escapeHtml } from '@/lib/spamGuard'
import {
  TURNSTILE_TOKEN_FIELD,
  turnstileRejection,
  verifyTurnstile,
} from '@/lib/turnstile'

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { feedback, email } = body

    // This route reads a session but does not require one, so it is postable
    // anonymously and mails out on every call.
    const clientId = getClientId(request)
    const turnstile = await verifyTurnstile(body?.[TURNSTILE_TOKEN_FIELD], clientId)
    if (!turnstile.ok) {
      return turnstileRejection(turnstile, `feedback from ${clientId}`)
    }

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 })
    }

    const resend = getResend()
    const userEmail = email || session?.user?.email || 'Anonymous'
    const userName = session?.user?.name || 'Unknown User'

    // This endpoint is postable anonymously, so treat every field as hostile
    // before it goes into an HTML email body.
    const safeFeedback = escapeHtml(String(feedback))
    const safeUserName = escapeHtml(String(userName))
    const safeUserEmail = escapeHtml(String(userEmail))
    const safeReplyTo = email ? escapeHtml(String(email)) : ''

    // Send feedback email to you
    const { error: sendError } = await resend.emails.send({
      from: 'MeetWith Feedback <notifications@meetwith.dev>',
      to: 'neelbvora@gmail.com',
      subject: `📝 New Feedback from ${safeUserName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">New Feedback Received</h2>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${safeUserName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${safeUserEmail}</p>
            <p style="margin: 0;"><strong>Logged in:</strong> ${session ? 'Yes' : 'No'}</p>
          </div>
          
          <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; white-space: pre-wrap; color: #1f2937;">${safeFeedback}</p>
          </div>
          
          ${email ? `
          <div style="margin-top: 20px;">
            <a href="mailto:${safeReplyTo}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
              Reply to ${safeReplyTo}
            </a>
          </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            Sent from MeetWith feedback form • ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    })

    // Resend reports failures in the result rather than by throwing, so an
    // unchecked call reports success for mail that was never delivered.
    if (sendError) {
      console.error('Feedback email failed to send:', sendError)
      return NextResponse.json(
        { error: 'Failed to send feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    )
  }
}
