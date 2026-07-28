/**
 * Cloudflare Turnstile verification.
 *
 * Turnstile is off until both keys are set, and an unconfigured deployment
 * passes rather than blocks. That keeps the signup form working between this
 * deploy and the moment the keys land in Vercel, and it means a local dev run
 * needs no Cloudflare account.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  )
}

export interface TurnstileResult {
  ok: boolean
  reason?: string
}

export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string
): Promise<TurnstileResult> {
  if (!isTurnstileConfigured()) {
    return { ok: true, reason: 'not-configured' }
  }

  if (typeof token !== 'string' || !token) {
    return { ok: false, reason: 'missing-token' }
  }

  const form = new URLSearchParams()
  form.set('secret', process.env.TURNSTILE_SECRET_KEY as string)
  form.set('response', token)
  if (remoteIp && remoteIp !== 'unknown-client') {
    form.set('remoteip', remoteIp)
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      // Do not let a slow Cloudflare response hang the signup request
      signal: AbortSignal.timeout(5000),
    })

    const data = (await response.json()) as {
      success?: boolean
      'error-codes'?: string[]
    }

    if (data.success) return { ok: true }
    return { ok: false, reason: data['error-codes']?.join(',') || 'rejected' }
  } catch (error) {
    // If Cloudflare is unreachable, fail open. The other layers still apply,
    // and a Turnstile outage must not take the signup form down with it.
    console.error('Turnstile verification failed to complete:', error)
    return { ok: true, reason: 'verify-unavailable' }
  }
}
