import type { Database } from '@inkwell/db'
import { schema } from '@inkwell/db'
import { and, eq, gt, lte } from 'drizzle-orm'
import type { Env } from '../env'
import { createOpaqueToken, hashOpaqueToken } from './tokens'

const LAST_SEEN_REFRESH_MS = 5 * 60 * 1_000

export type SessionUser = {
  id: string
  name: string
  email: string
}

export type ResolvedSession = {
  sessionId: string
  user: SessionUser
  expiresAt: Date
}

export type SessionMeta = {
  userAgent?: string | null
  ip?: string | null
}

export type CreatedSession = {
  token: string
  csrfToken: string
  expiresAt: Date
}

export function sessionDurationMs(env: Pick<Env, 'SESSION_TTL_DAYS'>): number {
  return env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1_000
}

export async function createSession(
  db: Database,
  user: SessionUser,
  env: Pick<Env, 'SESSION_TTL_DAYS'>,
  meta: SessionMeta = {},
  now = new Date(),
): Promise<CreatedSession> {
  const token = createOpaqueToken()
  const expiresAt = new Date(now.getTime() + sessionDurationMs(env))

  await db.insert(schema.sessions).values({
    userId: user.id,
    tokenHash: hashOpaqueToken(token),
    expiresAt,
    createdAt: now,
    lastSeenAt: now,
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
  })

  return {
    token,
    csrfToken: createOpaqueToken(),
    expiresAt,
  }
}

export async function resolveSession(
  db: Database,
  token: string,
  now = new Date(),
): Promise<ResolvedSession | null> {
  const tokenHash = hashOpaqueToken(token)
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      lastSeenAt: schema.sessions.lastSeenAt,
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)))
    .limit(1)

  const row = rows[0]

  if (!row) {
    await db
      .delete(schema.sessions)
      .where(and(eq(schema.sessions.tokenHash, tokenHash), lte(schema.sessions.expiresAt, now)))
    return null
  }

  if (now.getTime() - row.lastSeenAt.getTime() >= LAST_SEEN_REFRESH_MS) {
    await db
      .update(schema.sessions)
      .set({ lastSeenAt: now })
      .where(eq(schema.sessions.id, row.sessionId))
  }

  return {
    sessionId: row.sessionId,
    user: { id: row.userId, name: row.name, email: row.email },
    expiresAt: row.expiresAt,
  }
}

export async function destroySession(db: Database, token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashOpaqueToken(token)))
}

export async function destroyUserSessions(db: Database, userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
}
