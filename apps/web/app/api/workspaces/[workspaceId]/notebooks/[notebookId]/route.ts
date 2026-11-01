import {
  notebookIdSchema,
  updateNotebookInputSchema,
  workspaceIdSchema,
} from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const notebookParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  notebookId: notebookIdSchema,
})

export const PATCH = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, notebookId } = await parseParams(context.params, notebookParamsSchema)
  const input = await parseJson(request, updateNotebookInputSchema)

  await getServices().hierarchy.updateNotebook(actor, workspaceId, notebookId, input)
  return json({ ok: true })
})

export const DELETE = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, notebookId } = await parseParams(context.params, notebookParamsSchema)

  await getServices().hierarchy.deleteNotebook(actor, workspaceId, notebookId)
  return json({ ok: true })
})
