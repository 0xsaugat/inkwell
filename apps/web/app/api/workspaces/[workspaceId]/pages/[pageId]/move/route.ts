import { movePageInputSchema, pageIdSchema, workspaceIdSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const pageParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  pageId: pageIdSchema,
})

export const POST = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, pageId } = await parseParams(context.params, pageParamsSchema)
  const input = await parseJson(request, movePageInputSchema)

  await getServices().hierarchy.movePage(actor, workspaceId, pageId, input)
  return json({ ok: true })
})
