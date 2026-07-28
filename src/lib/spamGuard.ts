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

/*
 * Soft signals below. These are fuzzy, so they never drop a request: they flag
 * it. A flagged signup still reaches the inbox, labelled, and only the outbound
 * confirmation is withheld. That way a false positive costs a label rather than
 * a lost lead, and the form stops relaying mail to addresses it cannot trust.
 */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y'])

/**
 * Letter pairs that do not occur in real Latin-script names. Kept deliberately
 * short: every entry was checked against names that legitimately stack
 * consonants (Schmidt, Schwartz, Krzysztof, Dvorak, Djokovic, Wojciech,
 * Wojtyla, Sjoberg, Ljubljana, Bergkamp, Macpherson, Baxter, Zvi, Nguyen).
 */
const IMPLAUSIBLE_PAIRS = new Set([
  'jb', 'jd', 'jf', 'jg', 'jh', 'jk', 'jl', 'jm', 'jn', 'jp', 'jq', 'jr', 'js',
  'jv', 'jw', 'jx', 'jz',
  'qb', 'qc', 'qd', 'qf', 'qg', 'qh', 'qj', 'qk', 'ql', 'qm', 'qn', 'qp', 'qr',
  'qs', 'qt', 'qw', 'qx', 'qz',
  'xb', 'xc', 'xd', 'xf', 'xg', 'xj', 'xk', 'xm', 'xn', 'xq', 'xr', 'xs', 'xv',
  'xw', 'xz',
  'vf', 'vp', 'vq', 'vv', 'vx', 'vz',
  'cx', 'cv', 'cj', 'cq',
  'hc', 'hj', 'hq', 'hv', 'hx',
  'bx', 'bq', 'bj',
  'fq', 'fv', 'fx', 'fj',
  'gq', 'gx', 'gj',
  'kq', 'kx', 'kz',
  'mx', 'mq',
  'pq', 'pv', 'px',
  'tq', 'tv', 'tx',
  'wq', 'wv', 'wx', 'wj',
  'dq', 'dx',
  'sx', 'lq', 'lx', 'rq', 'rx', 'nq', 'nx',
  'zx', 'zj', 'zq',
])

/** Long runs of consonants. Treats y as a vowel, which real names rely on. */
function longestConsonantRun(word: string): number {
  let longest = 0
  let current = 0
  for (const char of word) {
    if (VOWELS.has(char)) {
      current = 0
    } else {
      current++
      if (current > longest) longest = current
    }
  }
  return longest
}

/**
 * Detects machine-generated names like "Qbvbsrc" or "Lhctfhgft" without
 * rejecting consonant-heavy real names.
 */
export function looksMachineGenerated(name: string): boolean {
  const words = name.toLowerCase().split(/\s+/).filter((w) => /^[a-z]{5,}$/.test(w))

  for (const word of words) {
    if (longestConsonantRun(word) >= 5) return true

    for (let i = 0; i < word.length - 1; i++) {
      if (IMPLAUSIBLE_PAIRS.has(word.slice(i, i + 2))) return true
    }
  }

  return false
}

/**
 * Gmail ignores dots, so scattered dots are how a script generates hundreds of
 * variants that all land in one real person's inbox. Signups like
 * "os.epu.l.o.sa.fo.22@gmail.com" are that person being subscription-bombed,
 * not someone asking for access, so we must not mail them.
 */
export function hasSuspiciousAliasing(email: string): boolean {
  const [local, domain] = email.toLowerCase().split('@')
  if (!local || !domain) return false
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') return false

  const dots = (local.match(/\./g) || []).length
  return dots >= 3
}

export interface SignupAssessment {
  suspicious: boolean
  reasons: string[]
}

/** Fuzzy scoring for a request that already cleared every hard check. */
export function assessSignup(email: string, name: string): SignupAssessment {
  const reasons: string[] = []

  if (hasSuspiciousAliasing(email)) reasons.push('gmail-dot-aliasing')
  if (name && looksMachineGenerated(name)) reasons.push('machine-generated-name')

  return { suspicious: reasons.length > 0, reasons }
}
