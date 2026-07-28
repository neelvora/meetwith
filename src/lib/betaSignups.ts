import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { normalizeEmail } from '@/lib/spamGuard'

/** How long a confirmation link stays usable. */
export const CONFIRMATION_TTL_HOURS = 48

export function createConfirmationToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Only the hash is stored, so someone who reads the table cannot confirm a
 * pending signup with what they find there.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface PendingSignup {
  id: string
  email: string
  name: string | null
  confirmed_at: string | null
  expires_at: string
}

export type CreatePendingResult =
  | { status: 'created'; token: string }
  | { status: 'already-confirmed' }
  | { status: 'unavailable' }

/**
 * Records a signup awaiting confirmation. Re-requesting for the same address
 * replaces any outstanding row, so a person who lost the first email gets a
 * fresh link rather than a duplicate pending entry.
 */
export async function createPendingSignup(
  email: string,
  name: string
): Promise<CreatePendingResult> {
  if (!supabaseAdmin) {
    console.warn('[beta-signup] Supabase not configured, cannot record signup')
    return { status: 'unavailable' }
  }

  const normalized = normalizeEmail(email)

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('beta_signups')
    .select('id, confirmed_at')
    .eq('normalized_email', normalized)
    .maybeSingle()

  if (lookupError) {
    console.error('[beta-signup] lookup failed:', lookupError)
    return { status: 'unavailable' }
  }

  if (existing?.confirmed_at) {
    return { status: 'already-confirmed' }
  }

  const token = createConfirmationToken()
  const expiresAt = new Date(
    Date.now() + CONFIRMATION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString()

  const row = {
    email,
    normalized_email: normalized,
    name: name || null,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    confirmed_at: null,
  }

  const { error: writeError } = existing
    ? await supabaseAdmin.from('beta_signups').update(row).eq('id', existing.id)
    : await supabaseAdmin.from('beta_signups').insert(row)

  if (writeError) {
    console.error('[beta-signup] write failed:', writeError)
    return { status: 'unavailable' }
  }

  return { status: 'created', token }
}

export type ConfirmResult =
  | { status: 'confirmed'; signup: PendingSignup }
  | { status: 'already-confirmed' }
  | { status: 'expired' }
  | { status: 'not-found' }
  | { status: 'unavailable' }

/**
 * Redeems a confirmation token. The update is conditional on confirmed_at
 * still being null, so two clicks on the same link only ever notify once.
 */
export async function confirmSignup(token: unknown): Promise<ConfirmResult> {
  if (!supabaseAdmin) return { status: 'unavailable' }

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return { status: 'not-found' }
  }

  const { data: row, error } = await supabaseAdmin
    .from('beta_signups')
    .select('id, email, name, confirmed_at, expires_at, token_hash')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (error) {
    console.error('[beta-signup] confirm lookup failed:', error)
    return { status: 'unavailable' }
  }
  if (!row) return { status: 'not-found' }

  // The lookup above already matched on the hash; compare again in constant
  // time so the code does not depend on how the database performed that match.
  if (!tokensMatch(row.token_hash, hashToken(token))) {
    return { status: 'not-found' }
  }

  if (row.confirmed_at) return { status: 'already-confirmed' }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { status: 'expired' }
  }

  const confirmedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('beta_signups')
    .update({ confirmed_at: confirmedAt })
    .eq('id', row.id)
    .is('confirmed_at', null)
    .select('id, email, name, confirmed_at, expires_at')

  if (updateError) {
    console.error('[beta-signup] confirm update failed:', updateError)
    return { status: 'unavailable' }
  }

  // Another request confirmed it between the read and the write
  if (!updated || updated.length === 0) return { status: 'already-confirmed' }

  return { status: 'confirmed', signup: updated[0] as PendingSignup }
}

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
