/**
 * Cloudflare Turnstile server-side verification.
 *
 * Canonical siteverify per developers.cloudflare.com/turnstile/spin. This is
 * the only place the secret is read, and it is read from the environment as
 * TURNSTILE_SECRET; the value is never inlined here.
 *
 * Fails closed. A network error, a non-2xx, a non-JSON body, or anything other
 * than `success === true` rejects the request. That means a deployment without
 * TURNSTILE_SECRET set will reject every protected submission, which is
 * deliberate: a silently disabled bot check is worse than a loud outage.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Field name Turnstile uses for the token, kept identical on our JSON posts. */
export const TURNSTILE_TOKEN_FIELD = 'cf-turnstile-response'

export interface TurnstileResult {
  ok: boolean
  errorCodes: string[]
}

export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET

  if (!secret) {
    // Loud, because every protected form is now rejecting and this is why.
    console.error(
      '[turnstile] TURNSTILE_SECRET is not set; rejecting all protected submissions'
    )
    return { ok: false, errorCodes: ['missing-input-secret'] }
  }

  if (typeof token !== 'string' || !token) {
    return { ok: false, errorCodes: ['missing-input-response'] }
  }

  const body = new URLSearchParams({ secret, response: token })

  // getClientId falls back to a placeholder when no proxy header is present;
  // sending that as remoteip would be worse than omitting it.
  if (remoteIp && remoteIp !== 'unknown-client') {
    body.set('remoteip', remoteIp)
  }

  let result: { success?: boolean; 'error-codes'?: string[] }
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    })
    // Parse before checking status. Cloudflare answers a bad secret with a 400
    // whose body still carries error-codes: ["invalid-input-secret"]. Treating
    // every non-2xx as opaque would throw away the one signal that tells us a
    // misconfigured deployment apart from a bad token.
    result = await response.json()
  } catch (error) {
    // Network failure, timeout, or a non-JSON body. Nothing to trust, so reject.
    console.error('[turnstile] siteverify call failed:', error)
    return { ok: false, errorCodes: ['siteverify-unavailable'] }
  }

  if (result?.success !== true) {
    const errorCodes = Array.isArray(result?.['error-codes'])
      ? result['error-codes']
      : []
    return { ok: false, errorCodes }
  }

  return { ok: true, errorCodes: [] }
}

/**
 * Shared rejection for a failed challenge. 403 rather than a silent success:
 * a real person can fail this (expired or already-redeemed token), and they
 * need to be told so the widget can reset and let them retry.
 */
export function turnstileRejection(result: TurnstileResult, context: string) {
  console.warn(
    `[turnstile] rejected ${context}: ${result.errorCodes.join(',') || 'no-code'}`
  )
  return Response.json(
    { error: 'Verification failed. Please try again.' },
    { status: 403 }
  )
}
