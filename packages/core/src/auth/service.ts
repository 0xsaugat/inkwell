import { schema } from '@inkwell/db'
import type {
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  PublicUser,
  SignInInput,
  SignUpInput,
} from '@inkwell/shared'
import { and, eq, gt, isNull, ne } from 'drizzle-orm'
import type { ServiceDeps } from '../service-context'
import { serviceClock } from '../service-context'
import {
  badRequest,
  conflict,
  emailFailed,
  isUniqueViolation,
  unauthorized,
} from '../errors'
import { escapeHtml } from '../mailer'
import { consumeFakePasswordCheck, hashPassword, verifyPassword } from './password'
import {
  createSession,
  destroySession,
  destroyUserSessions,
  resolveSession,
  sessionDurationMs,
  type CreatedSession,
  type ResolvedSession,
  type SessionMeta,
} from './session'
import { createOpaqueToken, hashOpaqueToken } from './tokens'

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1_000

type SignUpResult = {
  user: PublicUser
  session: CreatedSession
}

type SignInResult = {
  user: PublicUser
  session: CreatedSession
}

function toPublicUser(user: { id: string; name: string; email: string }): PublicUser {
  return { id: user.id, name: user.name, email: user.email }
}

function appBaseUrl(appUrl: string): string {
  return appUrl.replace(/\/+$/, '')
}

export function createAuthService(deps: ServiceDeps) {
  const { db, env, mailer } = deps
  const now = serviceClock(deps)

  async function signUp(input: SignUpInput, meta: SessionMeta = {}): Promise<SignUpResult> {
    const email = input.email.toLowerCase()
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    if (existing.length > 0) {
      throw conflict('An account with this email already exists')
    }

    const passwordHash = await hashPassword(input.password)

    let user: { id: string; name: string; email: string }

    try {
      const inserted = await db
        .insert(schema.users)
        .values({ name: input.name, email, passwordHash })
        .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email })

      const created = inserted[0]

      if (!created) {
        throw new Error('User insert returned no row')
      }

      user = created
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict('An account with this email already exists')
      }

      throw error
    }

    const session = await createSession(db, user, env, meta, now())

    return { user: toPublicUser(user), session }
  }

  async function signIn(input: SignInInput, meta: SessionMeta = {}): Promise<SignInResult> {
    const email = input.email.toLowerCase()
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        passwordHash: schema.users.passwordHash,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    const user = rows[0]

    if (!user?.passwordHash) {
      await consumeFakePasswordCheck(input.password)
      throw unauthorized('Email or password is incorrect')
    }

    const valid = await verifyPassword(user.passwordHash, input.password)

    if (!valid) {
      throw unauthorized('Email or password is incorrect')
    }

    const session = await createSession(db, user, env, meta, now())

    return { user: toPublicUser(user), session }
  }

  async function signOut(token: string): Promise<void> {
    await destroySession(db, token)
  }

  async function resolve(token: string): Promise<ResolvedSession | null> {
    return resolveSession(db, token, now())
  }

  async function requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
    const email = input.email.toLowerCase()
    const currentTime = now()
    const token = createOpaqueToken()
    const tokenHash = hashOpaqueToken(token)
    const expiresAt = new Date(currentTime.getTime() + PASSWORD_RESET_TTL_MS)

    const rows = await db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    const user = rows[0]

    if (user) {
      await db
        .delete(schema.passwordResetTokens)
        .where(
          and(
            eq(schema.passwordResetTokens.userId, user.id),
            isNull(schema.passwordResetTokens.usedAt),
          ),
        )

      await db.insert(schema.passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
        createdAt: currentTime,
      })
    }

    const resetUrl = `${appBaseUrl(env.APP_URL)}/reset-password?token=${encodeURIComponent(token)}`
    const subject = user ? 'Reset your Inkwell password' : 'Inkwell password reset request'
    const text = user
      ? `Hi ${user.name},\n\nUse this link to reset your Inkwell password. It expires in 60 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
      : `Someone requested a password reset for this email address, but no Inkwell account exists.\n\nIf this was you, create an account instead: ${appBaseUrl(env.APP_URL)}/signup\n\nOtherwise you can ignore this email.`
    const html = user
      ? `<p>Hi ${escapeHtml(user.name)},</p><p>Use the link below to reset your Inkwell password. It expires in 60 minutes.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
      : `<p>Someone requested a password reset for this email address, but no Inkwell account exists.</p><p>If this was you, <a href="${escapeHtml(appBaseUrl(env.APP_URL))}/signup">create an account</a> instead.</p><p>Otherwise you can ignore this email.</p>`

    try {
      await mailer.send({ to: email, subject, text, html })
    } catch (error) {
      if (user) {
        await db
          .delete(schema.passwordResetTokens)
          .where(eq(schema.passwordResetTokens.tokenHash, tokenHash))
      }

      throw emailFailed('The email service is unavailable. Try again shortly.', error)
    }
  }

  async function resetPassword(input: PasswordResetConfirmInput): Promise<void> {
    const currentTime = now()
    const tokenHash = hashOpaqueToken(input.token)
    const newPasswordHash = await hashPassword(input.password)

    await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: schema.passwordResetTokens.id,
          userId: schema.passwordResetTokens.userId,
        })
        .from(schema.passwordResetTokens)
        .where(
          and(
            eq(schema.passwordResetTokens.tokenHash, tokenHash),
            isNull(schema.passwordResetTokens.usedAt),
            gt(schema.passwordResetTokens.expiresAt, currentTime),
          ),
        )
        .limit(1)
        .for('update')

      const resetToken = rows[0]

      if (!resetToken) {
        throw badRequest('This reset link is invalid or has expired')
      }

      await tx
        .update(schema.users)
        .set({ passwordHash: newPasswordHash, updatedAt: currentTime })
        .where(eq(schema.users.id, resetToken.userId))

      await tx
        .update(schema.passwordResetTokens)
        .set({ usedAt: currentTime })
        .where(eq(schema.passwordResetTokens.id, resetToken.id))

      await tx
        .delete(schema.passwordResetTokens)
        .where(
          and(
            eq(schema.passwordResetTokens.userId, resetToken.userId),
            ne(schema.passwordResetTokens.id, resetToken.id),
          ),
        )

      await destroyUserSessions(tx, resetToken.userId)
    })
  }

  return {
    signUp,
    signIn,
    signOut,
    resolve,
    requestPasswordReset,
    resetPassword,
    sessionDurationMs: sessionDurationMs(env),
  }
}

export type AuthService = ReturnType<typeof createAuthService>
