import { escapeHtml } from '@/lib/spamGuard'

const WRAPPER =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;"

function formatSince(date: Date, timezone: string): string {
  const day = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  })
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
    timeZoneName: 'short',
  })
  return `${day} at ${time}`
}

export interface CalendarDisconnectedDetails {
  accountEmail: string
  disconnectedAt: Date
  calendarsUrl: string
  timezone?: string
}

/**
 * Sent once, the first time an account's token refresh fails. Until it is
 * reconnected that calendar cannot be read, so bookings on it are held.
 */
export function calendarDisconnectedEmail({
  accountEmail,
  disconnectedAt,
  calendarsUrl,
  timezone = 'America/Chicago',
}: CalendarDisconnectedDetails): string {
  const safeEmail = escapeHtml(accountEmail)

  return `
    <div style="${WRAPPER}">
      <h2 style="color: #b45309;">A calendar needs reconnecting</h2>
      <p>Google stopped accepting our access to <strong>${safeEmail}</strong>.</p>
      <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 8px; margin: 16px 0; color: #78350f; font-size: 14px;">
        <p style="margin: 0 0 8px 0;"><strong>Disconnected since:</strong> ${escapeHtml(formatSince(disconnectedAt, timezone))}</p>
        <p style="margin: 0;">
          Until it is reconnected we cannot read that calendar, so new bookings
          are held rather than offered over times that may already be taken.
        </p>
      </div>
      <p style="margin: 28px 0;">
        <a href="${calendarsUrl}" style="background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Reconnect this calendar
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Reconnecting takes one pass through the Google consent screen. Nothing
        else on the account changes.
      </p>
      <p style="color: #9ca3af; font-size: 12px;">Sent from MeetWith</p>
    </div>
  `
}
