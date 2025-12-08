import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

// Create client only if API key is available
function createResendClient(): Resend | null {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set - email features disabled')
    return null
  }
  return new Resend(resendApiKey)
}

export const resend = createResendClient()

// From address - use your verified domain
const FROM_EMAIL = 'MeetWith <bookings@meetwith.dev>'

interface BookingDetails {
  hostName: string
  hostEmail: string
  attendeeName: string
  attendeeEmail: string
  eventName: string
  startTime: Date
  endTime: Date
  duration: number
  meetLink?: string
  notes?: string
  bookingId: string
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })
}

/**
 * Send confirmation email to the attendee
 */
export async function sendAttendeeConfirmation(details: BookingDetails): Promise<boolean> {
  if (!resend) {
    console.log('Email skipped (Resend not configured):', details.attendeeEmail)
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: details.attendeeEmail,
      subject: `Confirmed: ${details.eventName} with ${details.hostName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmed</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <tr>
                <td>
                  <!-- Logo -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                      <span style="color: #8b5cf6;">Meet</span>With
                    </h1>
                  </div>
                  
                  <!-- Success Badge -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1)); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 9999px;">
                      <span style="color: #22c55e; font-size: 14px; font-weight: 600;">✓ Booking Confirmed</span>
                    </div>
                  </div>
                  
                  <!-- Main Content -->
                  <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px;">
                    <h2 style="margin: 0 0 24px 0; font-size: 20px; color: #ffffff; text-align: center;">
                      ${details.eventName}
                    </h2>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #9ca3af; font-size: 14px;">📅 When</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px;">${formatDateTime(details.startTime)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #9ca3af; font-size: 14px;">⏱ Duration</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px;">${details.duration} minutes</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #9ca3af; font-size: 14px;">👤 With</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px;">${details.hostName}</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    ${details.meetLink ? `
                    <!-- Join Meeting Button -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <a href="${details.meetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px;">
                        Join Google Meet →
                      </a>
                    </div>
                    ` : ''}
                    
                    ${details.notes ? `
                    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <p style="margin: 0 0 4px 0; color: #a78bfa; font-size: 12px; font-weight: 600; text-transform: uppercase;">Notes</p>
                      <p style="margin: 0; color: #d1d5db; font-size: 14px;">${details.notes}</p>
                    </div>
                    ` : ''}
                  </div>
                  
                  <!-- Footer -->
                  <div style="text-align: center; margin-top: 32px;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Need to reschedule? <a href="mailto:${details.hostEmail}" style="color: #8b5cf6;">Contact ${details.hostName}</a>
                    </p>
                    <p style="color: #4b5563; font-size: 11px; margin: 16px 0 0 0;">
                      Powered by <a href="https://meetwith.dev" style="color: #8b5cf6; text-decoration: none;">MeetWith</a>
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending attendee email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending attendee email:', error)
    return false
  }
}

/**
 * Send notification email to the host
 */
export async function sendHostNotification(details: BookingDetails): Promise<boolean> {
  if (!resend) {
    console.log('Email skipped (Resend not configured):', details.hostEmail)
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: details.hostEmail,
      subject: `New Booking: ${details.eventName} with ${details.attendeeName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Booking</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <tr>
                <td>
                  <!-- Logo -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                      <span style="color: #8b5cf6;">Meet</span>With
                    </h1>
                  </div>
                  
                  <!-- New Booking Badge -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 9999px;">
                      <span style="color: #a78bfa; font-size: 14px; font-weight: 600;">📅 New Booking</span>
                    </div>
                  </div>
                  
                  <!-- Main Content -->
                  <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #ffffff; text-align: center;">
                      ${details.attendeeName}
                    </h2>
                    <p style="margin: 0 0 24px 0; color: #9ca3af; font-size: 14px; text-align: center;">
                      booked ${details.eventName}
                    </p>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #9ca3af; font-size: 14px;">📅 When</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px;">${formatDateTime(details.startTime)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #9ca3af; font-size: 14px;">⏱ Duration</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px;">${details.duration} minutes</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #9ca3af; font-size: 14px;">📧 Attendee</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <a href="mailto:${details.attendeeEmail}" style="color: #8b5cf6; font-size: 14px; text-decoration: none;">${details.attendeeEmail}</a>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    ${details.meetLink ? `
                    <!-- Join Meeting Button -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <a href="${details.meetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px;">
                        Join Google Meet →
                      </a>
                    </div>
                    ` : ''}
                    
                    ${details.notes ? `
                    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <p style="margin: 0 0 4px 0; color: #a78bfa; font-size: 12px; font-weight: 600; text-transform: uppercase;">Notes from ${details.attendeeName}</p>
                      <p style="margin: 0; color: #d1d5db; font-size: 14px;">${details.notes}</p>
                    </div>
                    ` : ''}
                    
                    <!-- Manage Booking -->
                    <div style="text-align: center;">
                      <a href="https://www.meetwith.dev/dashboard" style="color: #8b5cf6; font-size: 14px; text-decoration: none;">
                        Manage in Dashboard →
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="text-align: center; margin-top: 32px;">
                    <p style="color: #4b5563; font-size: 11px; margin: 0;">
                      Powered by <a href="https://meetwith.dev" style="color: #8b5cf6; text-decoration: none;">MeetWith</a>
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending host email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending host email:', error)
    return false
  }
}

/**
 * Send both confirmation emails for a booking
 */
export async function sendBookingEmails(details: BookingDetails): Promise<{
  attendeeEmailSent: boolean
  hostEmailSent: boolean
}> {
  const [attendeeEmailSent, hostEmailSent] = await Promise.all([
    sendAttendeeConfirmation(details),
    sendHostNotification(details),
  ])

  return { attendeeEmailSent, hostEmailSent }
}
