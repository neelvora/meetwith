import { Resend } from 'resend'

/**
 * The senders in ./index.ts return a per-recipient boolean rather than
 * throwing. Callers that ignore it turn a failed delivery into a silent
 * success, which for a scheduling product means somebody never learns their
 * meeting was booked, moved, or cancelled. Pass the result through here so the
 * failure is at least visible in the logs and in Sentry.
 */
export function reportEmailResult(
  context: string,
  result: Record<string, boolean>
): void {
  const failed = Object.entries(result)
    .filter(([, sent]) => !sent)
    .map(([recipient]) => recipient)

  if (failed.length > 0) {
    console.error(`[email] ${context}: delivery failed for ${failed.join(', ')}`)
  }
}

/**
 * Resend returns { data, error } rather than throwing, so an unchecked call
 * reports success to the caller even when nothing was delivered. This wrapper
 * turns that into a thrown error so a failed send cannot be mistaken for a
 * delivered one.
 */
export async function sendMail(payload: {
  from: string
  to: string
  subject: string
  html: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send(payload)

  if (error) {
    throw new Error(`Resend rejected the message: ${error.message ?? String(error)}`)
  }
}
