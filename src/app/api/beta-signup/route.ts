import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Lazy initialize Resend to avoid build-time errors
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

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
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
            ${name ? `<p style="margin: 0;"><strong>Name:</strong> ${name}</p>` : ''}
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
          <p>Thanks for your interest in MeetWith${name ? `, ${name}` : ''}!</p>
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
            – Neel<br/>
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
