import { updateWorkspaceInputSchema, workspaceIdSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const workspaceParamsSchema = z.object({ workspaceId: workspaceIdSchema })

export const GET = apiHandler(async (_request, context) => {
  const actor = await requireApiActor()
  const { workspaceId } = await parseParams(context.params, workspaceParamsSchema)
  const detail = await getServices().workspaces.getWorkspaceDetail(actor, workspaceId)
  return json(detail)
})

export const PATCH = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId } = await parseParams(context.params, workspaceParamsSchema)
  const input = await parseJson(request, updateWorkspaceInputSchema)

  await getServices().workspaces.updateWorkspace(actor, workspaceId, input)

  return json({ ok: true })
})

export const DELETE = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId } = await parseParams(context.params, workspaceParamsSchema)

  await getServices().workspaces.deleteWorkspace(actor, workspaceId)

  return json({ ok: true })
})
