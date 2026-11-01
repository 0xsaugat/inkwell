import { memberUserIdSchema, updateMemberRoleInputSchema, workspaceIdSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const memberParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: memberUserIdSchema,
})

export const PATCH = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, userId } = await parseParams(context.params, memberParamsSchema)
  const input = await parseJson(request, updateMemberRoleInputSchema)

  await getServices().workspaces.changeMemberRole(actor, workspaceId, userId, input.role)

  return json({ ok: true })
})

export const DELETE = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, userId } = await parseParams(context.params, memberParamsSchema)

  await getServices().workspaces.removeMember(actor, workspaceId, userId)

  return json({ ok: true })
})
