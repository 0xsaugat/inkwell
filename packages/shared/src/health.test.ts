import { describe, expect, it } from 'vitest'
import { healthSchema } from './health'

describe('healthSchema', () => {
  it('accepts a healthy response', () => {
    const parsed = healthSchema.parse({
      status: 'ok',
      db: 'ok',
      version: '0.1.0',
      timestamp: '2026-10-31T10:00:00.000Z',
    })

    expect(parsed.status).toBe('ok')
  })

  it('rejects an unknown status', () => {
    expect(() =>
      healthSchema.parse({
        status: 'alive',
        db: 'ok',
        version: '0.1.0',
        timestamp: '2026-10-31T10:00:00.000Z',
      }),
    ).toThrow()
  })
})
