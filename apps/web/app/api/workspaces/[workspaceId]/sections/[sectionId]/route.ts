import {
  sectionIdSchema,
  updateSectionInputSchema,
  workspaceIdSchema,
} from '@inkwell/shared'
import { z } from 'zod'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

const sectionParamsSchema = z.object({
  workspaceId: workspaceIdSchema,
  sectionId: sectionIdSchema,
})

export const PATCH = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, sectionId } = await parseParams(context.params, sectionParamsSchema)
  const input = await parseJson(request, updateSectionInputSchema)

  await getServices().hierarchy.updateSection(actor, workspaceId, sectionId, input)
  return json({ ok: true })
})

export const DELETE = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId, sectionId } = await parseParams(context.params, sectionParamsSchema)

  await getServices().hierarchy.deleteSection(actor, workspaceId, sectionId)
  return json({ ok: true })
})
