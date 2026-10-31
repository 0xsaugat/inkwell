import type { Database } from '@inkwell/db'
import { schema } from '@inkwell/db'
import type { WorkspaceRole } from '@inkwell/shared'
import { and, eq } from 'drizzle-orm'
import { forbidden, notFound } from './errors'

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
}

export const roleRank: Readonly<Record<WorkspaceRole, number>> = ROLE_RANK

export type WorkspaceRef = {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type WorkspaceAccess = {
  workspace: WorkspaceRef
  role: WorkspaceRole
}

export type ActorRef = {
  id: string
}

export function roleAtLeast(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export function canWrite(role: WorkspaceRole): boolean {
  return roleAtLeast(role, 'editor')
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return roleAtLeast(role, 'owner')
}

export async function requireWorkspaceRole(
  db: Database,
  actor: ActorRef,
  workspaceId: string,
  minimum: WorkspaceRole,
): Promise<WorkspaceAccess> {
  const rows = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      createdBy: schema.workspaces.createdBy,
      createdAt: schema.workspaces.createdAt,
      updatedAt: schema.workspaces.updatedAt,
      role: schema.workspaceMembers.role,
    })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      and(
        eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
        eq(schema.workspaceMembers.userId, actor.id),
      ),
    )
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1)

  const row = rows[0]

  if (!row) {
    throw notFound('Workspace not found')
  }

  if (!roleAtLeast(row.role, minimum)) {
    throw forbidden('Your role in this workspace does not allow that action')
  }

  return {
    workspace: {
      id: row.id,
      name: row.name,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    role: row.role,
  }
}

export function requireWorkspaceWrite(
  db: Database,
  actor: ActorRef,
  workspaceId: string,
): Promise<WorkspaceAccess> {
  return requireWorkspaceRole(db, actor, workspaceId, 'editor')
}

export function requireWorkspaceOwner(
  db: Database,
  actor: ActorRef,
  workspaceId: string,
): Promise<WorkspaceAccess> {
  return requireWorkspaceRole(db, actor, workspaceId, 'owner')
}
