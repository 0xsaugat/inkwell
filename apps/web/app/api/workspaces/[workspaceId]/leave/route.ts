import { workspaceIdSchema } from '@inkwell/shared'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseParams, requireApiActor } from '@/lib/http'
import { getServices } from '@/lib/services'

export const POST = apiHandler(async (request, context) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const { workspaceId } = await parseParams(context.params, workspaceIdSchema)

  await getServices().workspaces.leaveWorkspace(actor, workspaceId)

  return json({ ok: true })
})
