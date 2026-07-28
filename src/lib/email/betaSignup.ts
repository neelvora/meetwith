import { escapeHtml } from '@/lib/spamGuard'
import { CONFIRMATION_TTL_HOURS } from '@/lib/betaSignups'

/** Where confirmed and flagged signups are reported. */
export const BETA_NOTIFY_ADDRESS = 'neelbvora@gmail.com'

const WRAPPER =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;"

/**
 * Sent to the address before anything else happens. Written for the case where
 * the reader did NOT sign up: it has to make clear nothing has happened yet and
 * that ignoring it is a complete answer.
 */
export function confirmationEmail(name: string, confirmUrl: string): string {
  const safeName = name ? escapeHtml(name) : ''

  return `
    <div style="${WRAPPER}">
      <h2 style="color: #7c3aed;">Confirm your MeetWith beta request</h2>
      <p>Hi${safeName ? ` ${safeName}` : ''}, someone asked for MeetWith beta access using this email address.</p>
      <p>If that was you, confirm below and I'll take it from there:</p>
      <p style="margin: 28px 0;">
        <a href="${confirmUrl}" style="background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Confirm my request
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        This link expires in ${CONFIRMATION_TTL_HOURS} hours.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 14px;">
        If it wasn't you, ignore this email. Nothing has been signed up, you are
        not on any list, and you will not hear from us again.
      </p>
      <p style="color: #9ca3af; font-size: 12px;">Sent from the MeetWith beta signup form</p>
    </div>
  `
}

/** Sent to Neel only once an address has proven it wanted in. */
export function notificationEmail(email: string, name: string): string {
  const safeEmail = escapeHtml(email)
  const safeName = name ? escapeHtml(name) : ''

  return `
    <div style="${WRAPPER}">
      <h2 style="color: #7c3aed;">Confirmed Beta Access Request</h2>
      <p style="color: #6b7280; font-size: 14px;">
        This address clicked the confirmation link, so it is a real inbox that
        asked to be here.
      </p>
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
      <p style="color: #9ca3af; font-size: 12px;">Sent from MeetWith beta signup form</p>
    </div>
  `
}

/** Sent to Neel for a request the spam checks flagged. Never sent to the address. */
export function flaggedNotificationEmail(
  email: string,
  name: string,
  reasons: string[]
): string {
  const safeEmail = escapeHtml(email)
  const safeName = name ? escapeHtml(name) : ''

  return `
    <div style="${WRAPPER}">
      <h2 style="color: #b45309;">Likely Spam Beta Request</h2>
      <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 8px; margin: 16px 0; color: #78350f; font-size: 14px;">
        <p style="margin: 0 0 8px 0;"><strong>Flagged:</strong> ${escapeHtml(reasons.join(', '))}</p>
        <p style="margin: 0;">
          No email was sent to this address and nothing was recorded. Shown here
          only so you can spot a false positive and reach out yourself.
        </p>
      </div>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${safeEmail}</p>
        ${safeName ? `<p style="margin: 0;"><strong>Name:</strong> ${safeName}</p>` : ''}
      </div>
      <p style="color: #9ca3af; font-size: 12px;">Sent from MeetWith beta signup form</p>
    </div>
  `
}

/** Sent to the address after it confirms. */
export function welcomeEmail(name: string): string {
  const safeName = name ? escapeHtml(name) : ''

  return `
    <div style="${WRAPPER}">
      <h2 style="color: #7c3aed;">You're on the list!</h2>
      <p>Thanks for confirming${safeName ? `, ${safeName}` : ''}!</p>
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
  `
}
