import { randomUUID } from 'node:crypto'
import { closeDb, getDb } from '@inkwell/db'
import { afterAll, describe, expect, it } from 'vitest'
import { getEnv } from '../env'
import { MemoryMailer, extractResetToken } from '../testing/memory-mailer'
import { createAuthService } from './service'

const mailer = new MemoryMailer()
const db = getDb()
const env = getEnv()
const auth = createAuthService({ db, env, mailer })

function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`
}

afterAll(async () => {
  await closeDb()
})

describe('auth service integration', () => {
  it('signs up, resolves the session, and rejects duplicate accounts', async () => {
    const email = uniqueEmail('signup')
    const result = await auth.signUp({
      name: 'Ada Lovelace',
      email,
      password: 'analytical-engine',
    })

    expect(result.user.email).toBe(email)
    const session = await auth.resolve(result.session.token)
    expect(session?.user.id).toBe(result.user.id)

    await expect(
      auth.signUp({ name: 'Duplicate', email, password: 'analytical-engine' }),
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('signs in with the right password only and can sign out', async () => {
    const email = uniqueEmail('signin')
    await auth.signUp({ name: 'Grace Hopper', email, password: 'compiler-1952' })

    await expect(auth.signIn({ email, password: 'wrong-password' })).rejects.toMatchObject({
      code: 'unauthorized',
    })

    const signedIn = await auth.signIn({ email, password: 'compiler-1952' })
    await expect(auth.resolve(signedIn.session.token)).resolves.not.toBeNull()

    await auth.signOut(signedIn.session.token)
    await expect(auth.resolve(signedIn.session.token)).resolves.toBeNull()
  })

  it('resets a password once, revokes sessions, and rejects reuse', async () => {
    const email = uniqueEmail('reset')
    const signup = await auth.signUp({
      name: 'Katherine Johnson',
      email,
      password: 'orbital-mechanics',
    })

    await auth.requestPasswordReset({ email })
    const message = mailer.lastTo(email)
    const token = extractResetToken(message.text)

    await auth.resetPassword({ token, password: 'new-orbital-mechanics' })

    await expect(auth.resolve(signup.session.token)).resolves.toBeNull()
    await expect(auth.signIn({ email, password: 'orbital-mechanics' })).rejects.toMatchObject({
      code: 'unauthorized',
    })

    const signedIn = await auth.signIn({ email, password: 'new-orbital-mechanics' })
    expect(signedIn.user.email).toBe(email)

    await expect(
      auth.resetPassword({ token, password: 'another-password-123' }),
    ).rejects.toMatchObject({ code: 'bad_request' })
  })

  it('sends a non-enumerating response for unknown reset emails', async () => {
    const email = uniqueEmail('unknown-reset')

    await expect(auth.requestPasswordReset({ email })).resolves.toBeUndefined()

    const message = mailer.lastTo(email)
    expect(message.subject).toBe('Inkwell password reset request')
    expect(message.text).toContain('no Inkwell account exists')
  })
})
