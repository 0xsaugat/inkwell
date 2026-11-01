import { createSectionInputSchema, workspaceIdSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const workspaceParamsSchema = z.object({ workspaceId: workspaceIdSchema })

export const POST = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId } = await parseParams(context.params, workspaceParamsSchema)
  const input = await parseJson(request, createSectionInputSchema)

  const section = await getServices().hierarchy.createSection(actor, workspaceId, input)
  return json({ section }, 201)
})
