import { pageIdSchema, workspaceIdSchema } from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const pageParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  pageId: pageIdSchema,
})

export const POST = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, pageId } = await parseParams(context.params, pageParamsSchema)

  await getServices().hierarchy.restorePage(actor, workspaceId, pageId)
  return json({ ok: true })
})
