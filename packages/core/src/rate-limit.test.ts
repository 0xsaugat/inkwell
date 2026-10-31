import { describe, expect, it } from 'vitest'
import { RateLimiter } from './rate-limit'

describe('RateLimiter', () => {
  it('allows requests up to the limit then reports retry time', () => {
    let now = 1_000
    const limiter = new RateLimiter(() => now)

    expect(limiter.consume('key', 2, 10_000).allowed).toBe(true)
    expect(limiter.consume('key', 2, 10_000).allowed).toBe(true)

    const blocked = limiter.consume('key', 2, 10_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBe(10)

    now += 10_000
    expect(limiter.consume('key', 2, 10_000).allowed).toBe(true)
  })

  it('keeps separate buckets per key and can reset', () => {
    const limiter = new RateLimiter(() => 5_000)

    expect(limiter.consume('a', 1, 1_000).allowed).toBe(true)
    expect(limiter.consume('a', 1, 1_000).allowed).toBe(false)
    expect(limiter.consume('b', 1, 1_000).allowed).toBe(true)

    limiter.reset('a')
    expect(limiter.consume('a', 1, 1_000).allowed).toBe(true)
  })

  it('prunes expired buckets when the map grows', () => {
    let now = 0
    const limiter = new RateLimiter(() => now, 2)

    limiter.consume('a', 1, 1_000)
    limiter.consume('b', 1, 1_000)
    now = 2_000
    limiter.consume('c', 1, 1_000)

    expect(limiter.consume('a', 1, 1_000).allowed).toBe(true)
  })
})
