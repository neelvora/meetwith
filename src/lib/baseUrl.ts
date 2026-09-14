/**
 * Absolute origin for links we put in emails.
 *
 * Prefers configured values over the request's own Host header: Host is
 * attacker-controlled, and trusting it would let someone point a confirmation
 * link at a domain they own.
 */

const FALLBACK_ORIGIN = 'https://www.meetwith.dev'

function configuredOrigin(): string | null {
  for (const configured of [process.env.APP_BASE_URL, process.env.NEXTAUTH_URL]) {
    if (!configured) continue
    try {
      return new URL(configured).origin
    } catch {
      // Ignore a malformed env value and try the next one
    }
  }
  return null
}

/** For links built where there is no request to fall back to, such as a token refresh. */
export function appBaseUrl(): string {
  return configuredOrigin() ?? FALLBACK_ORIGIN
}

export function resolveBaseUrl(request: Request): string {
  const configured = configuredOrigin()
  if (configured) return configured

  // Local development, where nothing is configured
  const host = request.headers.get('host')
  if (host) {
    const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https'
    return `${protocol}://${host}`
  }

  return FALLBACK_ORIGIN
}
