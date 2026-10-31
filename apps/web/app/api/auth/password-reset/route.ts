import { passwordResetRequestSchema } from '@inkwell/shared'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, getRequestIp, json, parseJson } from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limits'
import { getServices } from '@/lib/services'

const WINDOW_MS = 15 * 60 * 1_000

export const POST = apiHandler(async (request) => {
  assertCsrf(request)

  const input = await parseJson(request, passwordResetRequestSchema)
  const ip = getRequestIp(request)

  enforceRateLimit(`reset:ip:${ip}`, 10, WINDOW_MS, 'Too many reset requests')
  enforceRateLimit(
    `reset:email:${input.email}`,
    5,
    WINDOW_MS,
    'Too many reset requests for this email',
  )

  await getServices().auth.requestPasswordReset(input)

  return json({ ok: true })
})
