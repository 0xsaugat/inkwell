import { describe, expect, it } from 'vitest'
import { signUpInputSchema } from './auth'
import { createInviteInputSchema } from './workspaces'

describe('auth contracts', () => {
  it('normalizes email addresses and trims names', () => {
    const parsed = signUpInputSchema.parse({
      name: '  Ada Lovelace  ',
      email: '  ADA@Example.COM ',
      password: 'analytical-engine',
    })

    expect(parsed.name).toBe('Ada Lovelace')
    expect(parsed.email).toBe('ada@example.com')
  })

  it('rejects short passwords and invalid emails', () => {
    const short = signUpInputSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'short',
    })
    const invalidEmail = signUpInputSchema.safeParse({
      name: 'Ada',
      email: 'not-an-email',
      password: 'analytical-engine',
    })

    expect(short.success).toBe(false)
    expect(invalidEmail.success).toBe(false)
  })
})

describe('workspace contracts', () => {
  it('defaults invites to the editor role', () => {
    const parsed = createInviteInputSchema.parse({ email: 'TEAM@Example.com' })
    expect(parsed.role).toBe('editor')
    expect(parsed.email).toBe('team@example.com')
  })

  it('does not allow inviting someone as owner', () => {
    const parsed = createInviteInputSchema.safeParse({
      email: 'team@example.com',
      role: 'owner',
    })

    expect(parsed.success).toBe(false)
  })
})
