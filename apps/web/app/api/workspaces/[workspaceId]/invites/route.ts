import { createInviteInputSchema, workspaceIdSchema } from '@inkwell/shared'
import { assertCsrf } from '@/lib/csrf'
import {
  apiHandler,
  json,
  parseJson,
  parseParams,
  requireApiActor,
} from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limits'
import { getServices } from '@/lib/services'

export const POST = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId } = await parseParams(context.params, workspaceIdSchema)
  const input = await parseJson(request, createInviteInputSchema)

  enforceRateLimit(
    `invite:${actor.id}`,
    40,
    60 * 60 * 1_000,
    'Too many invites sent. Try again later.',
  )

  const invite = await getServices().workspaces.createInvite(actor, workspaceId, input)
  return json({ invite }, 201)
})
