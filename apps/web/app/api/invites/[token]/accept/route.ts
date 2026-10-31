import { inviteTokenSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const inviteParamsSchema = z.object({ token: inviteTokenSchema })

export const POST = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { token } = await parseParams(context.params, inviteParamsSchema)

  const result = await getServices().workspaces.acceptInvite(actor, token)

  return json(result)
})
