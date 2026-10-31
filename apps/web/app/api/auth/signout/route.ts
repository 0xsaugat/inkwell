import { assertCsrf } from '@/lib/csrf'
import { apiHandler, clearSessionCookies, getSessionToken, json } from '@/lib/http'
import { getServices } from '@/lib/services'

export const POST = apiHandler(async (request) => {
  assertCsrf(request)
  const token = await getSessionToken()

  if (token) {
    await getServices().auth.signOut(token)
  }

  const response = json({ ok: true })
  clearSessionCookies(response)
  return response
})
