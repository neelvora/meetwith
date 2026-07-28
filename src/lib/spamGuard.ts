/**
 * Spam heuristics for public, unauthenticated forms.
 *
 * Deliberately dependency-free and conservative: every rule here should be
 * something a real person filling in a signup form would never trip.
 */

/** Escape user input before it goes into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const MAX_EMAIL_LENGTH = 254
export const MAX_NAME_LENGTH = 80

/** Stricter than the usual one-liner: no spaces, no consecutive dots, real TLD. */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

export function isValidEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LENGTH) return false
  if (email.includes('..')) return false
  return EMAIL_PATTERN.test(email)
}

/**
 * Throwaway inbox providers. Not exhaustive by design: this trims the most
 * common bulk-signup sources without turning into a list we have to maintain.
 */
const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com',
  '10minutemail.com',
  '20minutemail.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'inboxbear.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'moakt.com',
  'mohmal.com',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.org',
  'tempmail.com',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}

/**
 * Collapse an address to a stable identity so plus-addressing and gmail dots
 * cannot be used to submit the same inbox hundreds of times.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const [rawLocal, domain] = trimmed.split('@')
  if (!rawLocal || !domain) return trimmed

  let local = rawLocal.split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '')
    return `${local}@gmail.com`
  }

  return `${local}@${domain}`
}

/** Link and markup signatures that only ever show up in automated submissions. */
const SPAM_CONTENT_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /<\s*[a-z]/i,
  /\[url[=\]]/i,
  /\[link[=\]]/i,
  /\r|\n/,
  /\b(seo|crypto|casino|viagra|backlink|forex|loan offer)\b/i,
]

export interface SpamCheck {
  spam: boolean
  reason?: string
}

/** Check the free-text name field. Empty is fine, it is optional. */
export function checkName(name: string): SpamCheck {
  if (!name) return { spam: false }
  if (name.length > MAX_NAME_LENGTH) return { spam: true, reason: 'name-too-long' }

  for (const pattern of SPAM_CONTENT_PATTERNS) {
    if (pattern.test(name)) return { spam: true, reason: 'name-content' }
  }

  return { spam: false }
}

/**
 * Same-origin check for a browser-only endpoint. Browsers always send Origin on
 * POST, so a request without one did not come from the site.
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get('host')
  if (!host) return false

  const allowedHosts = new Set([host])
  for (const envUrl of [process.env.APP_BASE_URL, process.env.NEXTAUTH_URL]) {
    if (!envUrl) continue
    try {
      allowedHosts.add(new URL(envUrl).host)
    } catch {
      // Ignore a malformed env value rather than failing the request.
    }
  }

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      return allowedHosts.has(new URL(origin).host)
    } catch {
      return false
    }
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return allowedHosts.has(new URL(referer).host)
    } catch {
      return false
    }
  }

  return false
}

/** Below this, the form was submitted faster than a person can fill it in. */
export const MIN_FORM_FILL_MS = 2500
