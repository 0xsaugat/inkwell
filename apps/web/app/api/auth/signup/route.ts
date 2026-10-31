import { signUpInputSchema } from '@inkwell/shared'
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

export const POST = apiHandler(async (request) => {
  assertCsrf(request)

  const input = await parseJson(request, signUpInputSchema)
  const ip = getRequestIp(request)

  enforceRateLimit(`signup:ip:${ip}`, 20, 60 * 60 * 1_000, 'Too many sign-up attempts')
  enforceRateLimit(
    `signup:email:${input.email}`,
    5,
    60 * 60 * 1_000,
    'Too many sign-up attempts for this email',
  )

  const result = await getServices().auth.signUp(input, getRequestMeta(request))
  const response = json({ user: result.user }, 201)
  setSessionCookies(response, result.session)
  return response
})
