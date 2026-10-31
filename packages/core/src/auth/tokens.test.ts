import { describe, expect, it } from 'vitest'
import { createOpaqueToken, hashOpaqueToken, tokensEqual } from './tokens'

describe('opaque tokens', () => {
  it('creates unique url-safe tokens', () => {
    const first = createOpaqueToken()
    const second = createOpaqueToken()

    expect(first).not.toBe(second)
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(first.length).toBeGreaterThanOrEqual(40)
  })

  it('hashes tokens deterministically without storing the secret', () => {
    const token = createOpaqueToken()
    const hash = hashOpaqueToken(token)

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toContain(token)
    expect(hashOpaqueToken(token)).toBe(hash)
  })

  it('compares tokens safely', () => {
    expect(tokensEqual('abc', 'abc')).toBe(true)
    expect(tokensEqual('abc', 'abd')).toBe(false)
    expect(tokensEqual('abc', 'abcd')).toBe(false)
  })
})
