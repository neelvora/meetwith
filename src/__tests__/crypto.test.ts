import { describe, it, expect, afterEach } from 'vitest'
import {
  decryptAccountTokens,
  decryptToken,
  encryptToken,
  isEncrypted,
} from '@/lib/crypto'

// 32 bytes, base64. Test-only value.
const TEST_KEY = Buffer.alloc(32, 7).toString('base64')

function withKey<T>(fn: () => T): T {
  const previous = process.env.ENCRYPTION_KEY
  process.env.ENCRYPTION_KEY = TEST_KEY
  try {
    return fn()
  } finally {
    if (previous === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = previous
  }
}

function withoutKey<T>(fn: () => T): T {
  const previous = process.env.ENCRYPTION_KEY
  delete process.env.ENCRYPTION_KEY
  try {
    return fn()
  } finally {
    if (previous !== undefined) process.env.ENCRYPTION_KEY = previous
  }
}

afterEach(() => {
  delete process.env.ENCRYPTION_KEY
})

describe('encryptToken / decryptToken', () => {
  it('round trips a token', () => {
    withKey(() => {
      const secret = 'ya29.a0AfB_byC-not-a-real-token'
      const sealed = encryptToken(secret)
      expect(sealed).not.toBe(secret)
      expect(sealed).not.toContain(secret)
      expect(decryptToken(sealed)).toBe(secret)
    })
  })

  it('produces a different ciphertext each time', () => {
    withKey(() => {
      const a = encryptToken('same-input')
      const b = encryptToken('same-input')
      expect(a).not.toBe(b)
      expect(decryptToken(a)).toBe('same-input')
      expect(decryptToken(b)).toBe('same-input')
    })
  })

  it('accepts a hex key as well as base64', () => {
    const previous = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('hex')
    try {
      expect(decryptToken(encryptToken('hex-keyed'))).toBe('hex-keyed')
    } finally {
      if (previous === undefined) delete process.env.ENCRYPTION_KEY
      else process.env.ENCRYPTION_KEY = previous
    }
  })

  it('rejects a key that is not 32 bytes', () => {
    const previous = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64')
    try {
      expect(() => encryptToken('x')).toThrow(/32 bytes/)
    } finally {
      if (previous === undefined) delete process.env.ENCRYPTION_KEY
      else process.env.ENCRYPTION_KEY = previous
    }
  })

  it('detects tampering via the auth tag', () => {
    withKey(() => {
      const sealed = encryptToken('tamper-me') as string
      const parts = sealed.split(':')
      // Flip the last character of the ciphertext segment
      const data = parts[4]
      parts[4] = data.slice(0, -1) + (data.endsWith('A') ? 'B' : 'A')
      expect(() => decryptToken(parts.join(':'))).toThrow()
    })
  })

  it('leaves null and empty values alone', () => {
    withKey(() => {
      expect(encryptToken(null)).toBeNull()
      expect(encryptToken(undefined)).toBeUndefined()
      expect(encryptToken('')).toBe('')
      expect(decryptToken(null)).toBeNull()
      expect(decryptToken('')).toBe('')
    })
  })

  it('does not double encrypt', () => {
    withKey(() => {
      const once = encryptToken('value')
      expect(encryptToken(once)).toBe(once)
    })
  })
})

describe('rollout safety', () => {
  it('passes legacy plaintext through on read, so existing rows keep working', () => {
    withKey(() => {
      expect(decryptToken('legacy-plaintext-token')).toBe('legacy-plaintext-token')
      expect(isEncrypted('legacy-plaintext-token')).toBe(false)
    })
  })

  it('stores plaintext unchanged when no key is configured', () => {
    withoutKey(() => {
      expect(encryptToken('no-key-yet')).toBe('no-key-yet')
      expect(decryptToken('no-key-yet')).toBe('no-key-yet')
    })
  })

  it('refuses to guess when the key vanishes but data is encrypted', () => {
    const sealed = withKey(() => encryptToken('important')) as string
    withoutKey(() => {
      expect(() => decryptToken(sealed)).toThrow(/ENCRYPTION_KEY is not set/)
    })
  })
})

describe('decryptAccountTokens', () => {
  it('decrypts both columns and preserves the rest of the row', () => {
    withKey(() => {
      const row = {
        id: 'abc',
        provider: 'google',
        access_token: encryptToken('access-value') as string,
        refresh_token: encryptToken('refresh-value') as string,
      }
      const out = decryptAccountTokens(row)
      expect(out.access_token).toBe('access-value')
      expect(out.refresh_token).toBe('refresh-value')
      expect(out.id).toBe('abc')
      expect(out.provider).toBe('google')
    })
  })

  it('handles a row with no refresh token', () => {
    withKey(() => {
      const out = decryptAccountTokens({
        access_token: encryptToken('only-access') as string,
        refresh_token: null,
      })
      expect(out.access_token).toBe('only-access')
      expect(out.refresh_token).toBeNull()
    })
  })

  it('handles a mixed row during migration', () => {
    withKey(() => {
      const out = decryptAccountTokens({
        access_token: encryptToken('new-encrypted') as string,
        refresh_token: 'old-plaintext',
      })
      expect(out.access_token).toBe('new-encrypted')
      expect(out.refresh_token).toBe('old-plaintext')
    })
  })
})
