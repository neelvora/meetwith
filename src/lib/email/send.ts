import { Resend } from 'resend'

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
