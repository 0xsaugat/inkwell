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

export type PageRef = {
  id: string
  workspaceId: string
  sectionId: string | null
  parentPageId: string | null
  type: 'flow' | 'canvas' | 'database'
  title: string
  icon: string | null
  cover: string | null
  position: string
  createdBy: string | null
  trashedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PageAccess = {
  page: PageRef
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

export async function requirePageRole(
  db: Database,
  actor: ActorRef,
  pageId: string,
  minimum: WorkspaceRole,
  workspaceId?: string,
): Promise<PageAccess> {
  const rows = await db
    .select({
      id: schema.pages.id,
      workspaceId: schema.pages.workspaceId,
      sectionId: schema.pages.sectionId,
      parentPageId: schema.pages.parentPageId,
      type: schema.pages.type,
      title: schema.pages.title,
      icon: schema.pages.icon,
      cover: schema.pages.cover,
      position: schema.pages.position,
      createdBy: schema.pages.createdBy,
      trashedAt: schema.pages.trashedAt,
      createdAt: schema.pages.createdAt,
      updatedAt: schema.pages.updatedAt,
      workspaceName: schema.workspaces.name,
      workspaceCreatedBy: schema.workspaces.createdBy,
      workspaceCreatedAt: schema.workspaces.createdAt,
      workspaceUpdatedAt: schema.workspaces.updatedAt,
      role: schema.workspaceMembers.role,
    })
    .from(schema.pages)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.pages.workspaceId))
    .innerJoin(
      schema.workspaceMembers,
      and(
        eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
        eq(schema.workspaceMembers.userId, actor.id),
      ),
    )
    .where(
      workspaceId
        ? and(eq(schema.pages.id, pageId), eq(schema.pages.workspaceId, workspaceId))
        : eq(schema.pages.id, pageId),
    )
    .limit(1)

  const row = rows[0]

  if (!row) {
    throw notFound('Page not found')
  }

  if (!roleAtLeast(row.role, minimum)) {
    throw forbidden('Your role in this workspace does not allow that action')
  }

  return {
    page: {
      id: row.id,
      workspaceId: row.workspaceId,
      sectionId: row.sectionId,
      parentPageId: row.parentPageId,
      type: row.type,
      title: row.title,
      icon: row.icon,
      cover: row.cover,
      position: row.position,
      createdBy: row.createdBy,
      trashedAt: row.trashedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    workspace: {
      id: row.workspaceId,
      name: row.workspaceName,
      createdBy: row.workspaceCreatedBy,
      createdAt: row.workspaceCreatedAt,
      updatedAt: row.workspaceUpdatedAt,
    },
    role: row.role,
  }
}

export function requirePageWrite(
  db: Database,
  actor: ActorRef,
  pageId: string,
  workspaceId?: string,
): Promise<PageAccess> {
  return requirePageRole(db, actor, pageId, 'editor', workspaceId)
}
