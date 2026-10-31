import { getEnv, type SessionUser } from '@inkwell/core'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getServices } from './services'

export const getCurrentActor = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies()
  const env = getEnv()
  const token = cookieStore.get(env.AUTH_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const session = await getServices().auth.resolve(token)
  return session?.user ?? null
})

export async function requireActor(nextPath: string): Promise<SessionUser> {
  const actor = await getCurrentActor()

  if (!actor) {
    redirect(`/signin?next=${encodeURIComponent(nextPath)}`)
  }

  return actor
}

export function safeNextPath(value: string | undefined, fallback = '/app'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/api')) {
    return fallback
  }

  return value
}
