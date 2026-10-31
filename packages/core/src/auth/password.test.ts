import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('hashes with argon2id and verifies the original password', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(hash.startsWith('$argon2id$')).toBe(true)
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true)
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false)
  })

  it('returns false instead of throwing on malformed hashes', async () => {
    await expect(verifyPassword('not-a-hash', 'password')).resolves.toBe(false)
  })
})
