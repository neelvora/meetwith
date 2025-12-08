import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { feedback, email } = await request.json()

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 })
    }

    const resend = getResend()
    const userEmail = email || session?.user?.email || 'Anonymous'
    const userName = session?.user?.name || 'Unknown User'

    // Send feedback email to you
    await resend.emails.send({
      from: 'MeetWith Feedback <notifications@meetwith.dev>',
      to: 'neelbvora@gmail.com',
      subject: `📝 New Feedback from ${userName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">New Feedback Received</h2>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${userName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 0;"><strong>Logged in:</strong> ${session ? 'Yes' : 'No'}</p>
          </div>
          
          <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; white-space: pre-wrap; color: #1f2937;">${feedback}</p>
          </div>
          
          ${email ? `
          <div style="margin-top: 20px;">
            <a href="mailto:${email}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
              Reply to ${email}
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    )
  }
}
