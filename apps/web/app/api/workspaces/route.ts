import { createWorkspaceInputSchema } from '@inkwell/shared'
import { assertCsrf } from '@/lib/csrf'
import { apiHandler, json, parseJson, requireApiActor } from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limits'
import { getServices } from '@/lib/services'

export const GET = apiHandler(async () => {
  const actor = await requireApiActor()
  const workspaces = await getServices().workspaces.listWorkspaces(actor)
  return json({ workspaces })
})

export const POST = apiHandler(async (request) => {
  assertCsrf(request)
  const actor = await requireApiActor()
  const input = await parseJson(request, createWorkspaceInputSchema)

  enforceRateLimit(
    `workspace-create:${actor.id}`,
    30,
    60 * 60 * 1_000,
    'Too many workspaces created. Try again later.',
  )

  const workspace = await getServices().workspaces.createWorkspace(actor, input)
  return json({ workspace }, 201)
})
