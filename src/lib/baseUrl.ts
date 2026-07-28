/**
 * Absolute origin for links we put in emails.
 *
 * Prefers configured values over the request's own Host header: Host is
 * attacker-controlled, and trusting it would let someone point a confirmation
 * link at a domain they own.
 */
export function resolveBaseUrl(request: Request): string {
  for (const configured of [process.env.APP_BASE_URL, process.env.NEXTAUTH_URL]) {
    if (!configured) continue
    try {
      return new URL(configured).origin
    } catch {
      // Ignore a malformed env value and try the next one
    }
  }

  // Local development, where nothing is configured
  const host = request.headers.get('host')
  if (host) {
    const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https'
    return `${protocol}://${host}`
  }

  return 'https://www.meetwith.dev'
}
