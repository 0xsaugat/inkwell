import { inviteIdSchema, workspaceIdSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const inviteParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  inviteId: inviteIdSchema,
})

export const DELETE = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, inviteId } = await parseParams(context.params, inviteParamsSchema)

  await getServices().workspaces.revokeInvite(actor, workspaceId, inviteId)

  return json({ ok: true })
})
