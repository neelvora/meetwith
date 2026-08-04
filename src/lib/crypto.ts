import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Encryption at rest for OAuth tokens.
 *
 * Calendar tokens are the most sensitive values we hold: a refresh token grants
 * read and write access to somebody's calendar until they revoke it. They must
 * not sit in the database in plaintext.
 *
 * Two properties make this safe to roll out against a live table:
 *
 *   1. decryptToken passes through anything that is not in our envelope format,
 *      so rows written before this existed keep working untouched.
 *   2. encryptToken is a no-op when ENCRYPTION_KEY is unset, so a deploy that
 *      lands before the key does still stores and reads tokens correctly.
 *
 * Once the key is set, run scripts/encrypt-tokens.mjs to convert existing rows.
 */

const ALGORITHM = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const IV_LENGTH = 12
const KEY_LENGTH = 32

let warnedMissingKey = false

/** Accepts base64 or hex, and requires exactly 32 bytes. */
function loadKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null

  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes, got ${key.length}. ` +
        'Generate one with: openssl rand -base64 32'
    )
  }
  return key
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY)
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX)
}

/**
 * Returns the envelope `enc:v1:<iv>:<authTag>:<ciphertext>`, all base64.
 * Returns the input unchanged when no key is configured, or when the value is
 * empty or already encrypted.
 */
export function encryptToken<T extends string | null | undefined>(value: T): T {
  if (!value) return value
  if (isEncrypted(value)) return value

  const key = loadKey()
  if (!key) {
    if (!warnedMissingKey) {
      console.warn(
        '[crypto] ENCRYPTION_KEY is not set; OAuth tokens are being stored in plaintext'
      )
      warnedMissingKey = true
    }
    return value
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}` as T
}

/**
 * Inverse of encryptToken. A value without the envelope prefix is assumed to be
 * a legacy plaintext row and returned as-is, which is what makes the rollout
 * non-breaking.
 */
export function decryptToken<T extends string | null | undefined>(value: T): T {
  if (!value) return value
  if (!isEncrypted(value)) return value

  const key = loadKey()
  if (!key) {
    throw new Error(
      '[crypto] found an encrypted token but ENCRYPTION_KEY is not set. ' +
        'Restore the key; without it these tokens cannot be recovered.'
    )
  }

  const parts = value.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('[crypto] malformed encrypted token envelope')
  }

  const [ivB64, tagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return plaintext.toString('utf8') as T
}

export interface TokenBearingAccount {
  access_token?: string | null
  refresh_token?: string | null
}

/**
 * Decrypts a calendar_accounts row in place of reading the columns directly.
 * Use this at every read site so callers never handle ciphertext.
 */
export function decryptAccountTokens<T extends TokenBearingAccount>(account: T): T {
  return {
    ...account,
    access_token: decryptToken(account.access_token),
    refresh_token: decryptToken(account.refresh_token),
  }
}
