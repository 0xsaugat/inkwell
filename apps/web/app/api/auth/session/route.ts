import { CSRF_COOKIE_NAME } from '@/lib/cookies'
import { apiHandler, getSessionToken, json } from '@/lib/http'
import { getServices } from '@/lib/services'

export const GET = apiHandler(async (request) => {
  const token = await getSessionToken()

  if (!token) {
    return json({ user: null })
  }

  const session = await getServices().auth.resolve(token)

  if (!session) {
    return json({ user: null })
  }

  return json({
    user: session.user,
    csrfToken: request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null,
    expiresAt: session.expiresAt.toISOString(),
  })
})
