/**
 * One-time backfill: encrypt calendar_accounts OAuth tokens that are still
 * stored in plaintext.
 *
 * Run once after ENCRYPTION_KEY is set, from the repo root:
 *
 *   node --env-file=.env.local scripts/encrypt-tokens.mjs          # dry run
 *   node --env-file=.env.local scripts/encrypt-tokens.mjs --apply  # write
 *
 * Safe to run more than once: rows already in the envelope format are skipped.
 * The envelope format is defined in src/lib/crypto.ts and must stay in step
 * with it. Every row written here is read back and decrypted before the script
 * reports success, so a mismatch fails loudly instead of corrupting tokens.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ALGORITHM = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const APPLY = process.argv.includes('--apply')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const rawKey = process.env.ENCRYPTION_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!rawKey) {
  console.error('Missing ENCRYPTION_KEY. Generate one with: openssl rand -base64 32')
  process.exit(1)
}

const key = /^[0-9a-fA-F]{64}$/.test(rawKey)
  ? Buffer.from(rawKey, 'hex')
  : Buffer.from(rawKey, 'base64')

if (key.length !== 32) {
  console.error(`ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`)
  process.exit(1)
}

const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX)

function encrypt(value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

function decrypt(value) {
  const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':')
  const d = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  d.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([d.update(Buffer.from(dataB64, 'base64')), d.final()]).toString('utf8')
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: rows, error } = await supabase
  .from('calendar_accounts')
  .select('id, account_email, access_token, refresh_token')

if (error) {
  console.error('Failed to read calendar_accounts:', error.message)
  process.exit(1)
}

console.log(`${rows.length} calendar account(s) found`)
if (!APPLY) console.log('DRY RUN. Re-run with --apply to write.\n')

let changed = 0
let skipped = 0

for (const row of rows) {
  const needsAccess = row.access_token && !isEncrypted(row.access_token)
  const needsRefresh = row.refresh_token && !isEncrypted(row.refresh_token)

  if (!needsAccess && !needsRefresh) {
    skipped++
    continue
  }

  const label = `${row.account_email || row.id}`
  const fields = [needsAccess && 'access_token', needsRefresh && 'refresh_token']
    .filter(Boolean)
    .join(', ')

  if (!APPLY) {
    console.log(`  would encrypt ${fields} for ${label}`)
    changed++
    continue
  }

  const update = {}
  if (needsAccess) update.access_token = encrypt(row.access_token)
  if (needsRefresh) update.refresh_token = encrypt(row.refresh_token)

  const { error: writeError } = await supabase
    .from('calendar_accounts')
    .update(update)
    .eq('id', row.id)

  if (writeError) {
    console.error(`  FAILED for ${label}: ${writeError.message}`)
    process.exit(1)
  }

  // Read back and decrypt, so a bad write is caught here rather than at
  // the next booking.
  const { data: check, error: checkError } = await supabase
    .from('calendar_accounts')
    .select('access_token, refresh_token')
    .eq('id', row.id)
    .single()

  if (checkError) {
    console.error(`  VERIFY FAILED for ${label}: ${checkError.message}`)
    process.exit(1)
  }
  if (needsAccess && decrypt(check.access_token) !== row.access_token) {
    console.error(`  VERIFY MISMATCH on access_token for ${label}`)
    process.exit(1)
  }
  if (needsRefresh && decrypt(check.refresh_token) !== row.refresh_token) {
    console.error(`  VERIFY MISMATCH on refresh_token for ${label}`)
    process.exit(1)
  }

  console.log(`  encrypted and verified ${fields} for ${label}`)
  changed++
}

console.log(
  `\n${APPLY ? 'Encrypted' : 'Would encrypt'} ${changed} row(s), ${skipped} already done.`
)
