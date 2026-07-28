import { describe, it, expect } from 'vitest'
import {
  assessSignup,
  checkName,
  escapeHtml,
  hasSuspiciousAliasing,
  isDisposableEmail,
  isSameOrigin,
  isValidEmail,
  looksMachineGenerated,
  normalizeEmail,
} from '@/lib/spamGuard'

describe('escapeHtml', () => {
  it('neutralizes markup so input cannot inject into an email body', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('escapes quotes and ampersands', () => {
    expect(escapeHtml(`Tom & "Jerry" O'Neil`)).toBe(
      'Tom &amp; &quot;Jerry&quot; O&#39;Neil'
    )
  })

  it('leaves ordinary names untouched', () => {
    expect(escapeHtml('Neel Vora')).toBe('Neel Vora')
  })
})

describe('isValidEmail', () => {
  it('accepts real addresses', () => {
    expect(isValidEmail('neel@meetwith.dev')).toBe(true)
    expect(isValidEmail('first.last+tag@sub.example.co.uk')).toBe(true)
  })

  it('rejects malformed addresses', () => {
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('two@@example.com')).toBe(false)
    expect(isValidEmail('spaces in@example.com')).toBe(false)
    expect(isValidEmail('trailing@example')).toBe(false)
    expect(isValidEmail('double..dot@example.com')).toBe(false)
  })

  it('rejects addresses over the length limit', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })
})

describe('isDisposableEmail', () => {
  it('flags known throwaway providers', () => {
    expect(isDisposableEmail('bot@mailinator.com')).toBe(true)
    expect(isDisposableEmail('BOT@YOPMAIL.COM')).toBe(true)
  })

  it('allows normal providers', () => {
    expect(isDisposableEmail('neel@gmail.com')).toBe(false)
    expect(isDisposableEmail('someone@company.io')).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('collapses gmail dots and plus tags to one identity', () => {
    expect(normalizeEmail('Neel.B.Vora+beta1@gmail.com')).toBe('neelbvora@gmail.com')
    expect(normalizeEmail('neelbvora@googlemail.com')).toBe('neelbvora@gmail.com')
  })

  it('strips plus tags but keeps dots on other providers', () => {
    expect(normalizeEmail('first.last+x@example.com')).toBe('first.last@example.com')
  })

  it('passes through malformed values unchanged apart from case', () => {
    expect(normalizeEmail(' NotAnEmail ')).toBe('notanemail')
  })
})

describe('checkName', () => {
  it('allows an empty or ordinary name', () => {
    expect(checkName('').spam).toBe(false)
    expect(checkName('Neel Vora').spam).toBe(false)
    expect(checkName("Siobhán O'Brien-Smith").spam).toBe(false)
  })

  it('flags links', () => {
    expect(checkName('Cheap deals https://spam.example').spam).toBe(true)
    expect(checkName('visit www.spam.example').spam).toBe(true)
    expect(checkName('[url=http://x.example]click[/url]').spam).toBe(true)
  })

  it('flags markup and multi-line payloads', () => {
    expect(checkName('<a href="x">click</a>').spam).toBe(true)
    expect(checkName('Line one\nLine two').spam).toBe(true)
  })

  it('flags common spam keywords', () => {
    expect(checkName('SEO services').spam).toBe(true)
    expect(checkName('crypto investment').spam).toBe(true)
  })

  it('flags an overlong name', () => {
    expect(checkName('a'.repeat(200)).spam).toBe(true)
  })
})

describe('isSameOrigin', () => {
  const makeRequest = (headers: Record<string, string>) =>
    new Request('https://www.meetwith.dev/api/beta-signup', {
      method: 'POST',
      headers,
    })

  it('accepts an Origin matching the request host', () => {
    expect(
      isSameOrigin(
        makeRequest({ host: 'www.meetwith.dev', origin: 'https://www.meetwith.dev' })
      )
    ).toBe(true)
  })

  it('rejects a cross-site Origin', () => {
    expect(
      isSameOrigin(
        makeRequest({ host: 'www.meetwith.dev', origin: 'https://attacker.example' })
      )
    ).toBe(false)
  })

  it('rejects a request with no Origin or Referer, as scripted posts have', () => {
    expect(isSameOrigin(makeRequest({ host: 'www.meetwith.dev' }))).toBe(false)
  })

  it('falls back to Referer when Origin is stripped', () => {
    expect(
      isSameOrigin(
        makeRequest({ host: 'www.meetwith.dev', referer: 'https://www.meetwith.dev/' })
      )
    ).toBe(true)
  })

  it('rejects a malformed Origin', () => {
    expect(
      isSameOrigin(makeRequest({ host: 'www.meetwith.dev', origin: 'not-a-url' }))
    ).toBe(false)
  })

  it('works on localhost during development', () => {
    const request = new Request('http://localhost:3000/api/beta-signup', {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
    })
    expect(isSameOrigin(request)).toBe(true)
  })
})

/**
 * The five names below are verbatim from the spam that hit the live form on
 * 27-28 Jul 2026. The real-name list next to them is the precision guard: these
 * are exactly the consonant-heavy names a naive vowel-count heuristic rejects.
 */
describe('looksMachineGenerated', () => {
  const SPAM_NAMES = [
    'Shkrac Jnhctm',
    'Etyzvvcv Lhctfhgft',
    'Nlagkm Asarycx',
    'Qxvyc Qbvbsrc',
    'Ihtg Uejtslbu',
  ]

  it.each(SPAM_NAMES)('flags the observed spam name %s', (name) => {
    expect(looksMachineGenerated(name)).toBe(true)
  })

  const REAL_NAMES = [
    'Neel Vora',
    'Hans Schmidt',
    'Erik Schwartz',
    'Krzysztof Nowak',
    'Wojciech Kowalski',
    'Karol Wojtyla',
    'Antonin Dvorak',
    'Petra Kvitova',
    'Novak Djokovic',
    'Annika Sjoberg',
    'Dennis Bergkamp',
    'Elle Macpherson',
    'Meredith Baxter',
    'Zvi Rosenberg',
    'Thanh Nguyen',
    'Jana Trnka',
    'Anna Szczepanski',
    'Siobhan McLoughlin',
    'Bartlomiej Strzelecki',
    'Pjotr Ivanov',
    'Xiaoling Zhang',
    'Ngozi Okonkwo',
  ]

  it.each(REAL_NAMES)('leaves the real name %s alone', (name) => {
    expect(looksMachineGenerated(name)).toBe(false)
  })

  it('ignores short tokens rather than guessing at initials', () => {
    expect(looksMachineGenerated('J K Ng')).toBe(false)
  })

  it('ignores an empty name', () => {
    expect(looksMachineGenerated('')).toBe(false)
  })
})

describe('hasSuspiciousAliasing', () => {
  const BOMBING_ADDRESSES = [
    'os.epu.l.o.sa.fo.22@gmail.com',
    't.d.ur.so.326@gmail.com',
    'dlb.o.r.o.vies@gmail.com',
  ]

  it.each(BOMBING_ADDRESSES)('flags the scattered-dot gmail %s', (email) => {
    expect(hasSuspiciousAliasing(email)).toBe(true)
  })

  it('allows a normally punctuated gmail', () => {
    expect(hasSuspiciousAliasing('neel.vora@gmail.com')).toBe(false)
    expect(hasSuspiciousAliasing('neel.b.vora@gmail.com')).toBe(false)
    expect(hasSuspiciousAliasing('neelvora@gmail.com')).toBe(false)
  })

  it('only applies to gmail, where dots are ignored by the provider', () => {
    expect(hasSuspiciousAliasing('a.b.c.d@example.com')).toBe(false)
  })
})

describe('assessSignup', () => {
  it('flags a real observed spam signup and says why', () => {
    const result = assessSignup('os.epu.l.o.sa.fo.22@gmail.com', 'Shkrac Jnhctm')
    expect(result.suspicious).toBe(true)
    expect(result.reasons).toContain('gmail-dot-aliasing')
    expect(result.reasons).toContain('machine-generated-name')
  })

  it('flags on the name alone when the domain looks ordinary', () => {
    const result = assessSignup('stnaka@hawaii.rr.com', 'Etyzvvcv Lhctfhgft')
    expect(result.suspicious).toBe(true)
    expect(result.reasons).toEqual(['machine-generated-name'])
  })

  it('clears an ordinary signup', () => {
    const result = assessSignup('neel.vora@gmail.com', 'Neel Vora')
    expect(result.suspicious).toBe(false)
    expect(result.reasons).toEqual([])
  })

  it('clears a signup with no name given', () => {
    expect(assessSignup('someone@company.io', '').suspicious).toBe(false)
  })
})
