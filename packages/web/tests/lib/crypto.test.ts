import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/crypto'

describe('encrypt / decrypt', () => {
  it('roundtrip: decrypt(encrypt(x)) === x', () => {
    const plain = 'hello world'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('handles JSON payloads with special characters', () => {
    const payload = JSON.stringify({ accessToken: 'eyJ.abc.def', refreshToken: 'rft_123!@#$%' })
    expect(decrypt(encrypt(payload))).toBe(payload)
  })

  it('generates a different ciphertext each call (random IV)', () => {
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
    // Both must still decrypt correctly
    expect(decrypt(a)).toBe('same')
    expect(decrypt(b)).toBe('same')
  })

  it('throws when TOKEN_ENCRYPTION_KEY is missing', () => {
    const orig = process.env.TOKEN_ENCRYPTION_KEY
    delete process.env.TOKEN_ENCRYPTION_KEY
    expect(() => encrypt('x')).toThrow('TOKEN_ENCRYPTION_KEY')
    process.env.TOKEN_ENCRYPTION_KEY = orig
  })

  it('throws when TOKEN_ENCRYPTION_KEY is wrong length', () => {
    const orig = process.env.TOKEN_ENCRYPTION_KEY
    process.env.TOKEN_ENCRYPTION_KEY = 'short'
    expect(() => encrypt('x')).toThrow('TOKEN_ENCRYPTION_KEY')
    process.env.TOKEN_ENCRYPTION_KEY = orig
  })

  it('throws on tampered ciphertext (auth tag mismatch)', () => {
    const ciphertext = JSON.parse(encrypt('sensitive'))
    ciphertext.encrypted = 'deadbeef'.repeat(4)
    expect(() => decrypt(JSON.stringify(ciphertext))).toThrow()
  })

  it('throws on tampered auth tag', () => {
    const ciphertext = JSON.parse(encrypt('sensitive'))
    ciphertext.tag = 'deadbeef'.repeat(4)
    expect(() => decrypt(JSON.stringify(ciphertext))).toThrow()
  })
})
