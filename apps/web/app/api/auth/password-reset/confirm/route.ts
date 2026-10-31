import { passwordResetConfirmSchema } from '@inkwell/shared'
import { assertCsrf } from '@/lib/csrf'
import {
  apiHandler,
  clearSessionCookies,
  getRequestIp,
  json,
  parseJson,
} from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limits'
import { getServices } from '@/lib/services'

export const POST = apiHandler(async (request) => {
  assertCsrf(request)

  const input = await parseJson(request, passwordResetConfirmSchema)

  enforceRateLimit(
    `reset-confirm:ip:${getRequestIp(request)}`,
    20,
    15 * 60 * 1_000,
    'Too many reset attempts',
  )

  await getServices().auth.resetPassword(input)

  const response = json({ ok: true })
  clearSessionCookies(response)
  return response
})
