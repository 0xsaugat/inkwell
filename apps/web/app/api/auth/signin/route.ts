import { signInInputSchema } from '@inkwell/shared'
import { assertCsrf } from '@/lib/csrf'
import {
  apiHandler,
  getRequestIp,
  getRequestMeta,
  json,
  parseJson,
  setSessionCookies,
} from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limits'
import { getServices } from '@/lib/services'

const WINDOW_MS = 15 * 60 * 1_000

export const POST = apiHandler(async (request) => {
  assertCsrf(request)

  const input = await parseJson(request, signInInputSchema)
  const ip = getRequestIp(request)

  enforceRateLimit(`signin:ip:${ip}`, 30, WINDOW_MS, 'Too many sign-in attempts')
  enforceRateLimit(
    `signin:email:${input.email}`,
    10,
    WINDOW_MS,
    'Too many sign-in attempts for this email',
  )

  const result = await getServices().auth.signIn(input, getRequestMeta(request))
  const response = json({ user: result.user })
  setSessionCookies(response, result.session)
  return response
})
