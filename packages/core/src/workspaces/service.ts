import { schema } from '@inkwell/db'
import type {
  AssignableRole,
  CreateInviteInput,
  CreateWorkspaceInput,
  InvitePreview,
  UpdateWorkspaceInput,
  WorkspaceDetail,
  WorkspaceInviteView,
  WorkspaceMemberView,
  WorkspaceRole,
  WorkspaceSummary,
} from '@inkwell/shared'
import { and, asc, count, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { conflict, emailFailed, forbidden, notFound } from '../errors'
import { requireWorkspaceOwner, requireWorkspaceRole } from '../authz'
import type { SessionUser } from '../auth/session'
import { createOpaqueToken, hashOpaqueToken } from '../auth/tokens'
import { escapeHtml } from '../mailer'
import type { ServiceDeps } from '../service-context'
import { serviceClock } from '../service-context'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1_000

type Actor = Pick<SessionUser, 'id' | 'name' | 'email'>

function appBaseUrl(appUrl: string): string {
  return appUrl.replace(/\/+$/, '')
}

function toAssignableRole(role: WorkspaceRole): AssignableRole {
  return role === 'viewer' ? 'viewer' : 'editor'
}

function workspaceSummary(
  row: {
    id: string
    name: string
    role: WorkspaceRole
    createdAt: Date
  },
  memberCount: number,
): WorkspaceSummary {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    memberCount,
    createdAt: row.createdAt.toISOString(),
  }
}

function inviteView(row: {
  id: string
  email: string
  role: WorkspaceRole
  expiresAt: Date
  createdAt: Date
}): WorkspaceInviteView {
  return {
    id: row.id,
    email: row.email,
    role: toAssignableRole(row.role),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export function createWorkspaceService(deps: ServiceDeps) {
  const { db, env, mailer } = deps
  const now = serviceClock(deps)

  async function listWorkspaces(actor: Actor): Promise<WorkspaceSummary[]> {
    const rows = await db
      .select({
        id: schema.workspaces.id,
        name: schema.workspaces.name,
        role: schema.workspaceMembers.role,
        createdAt: schema.workspaces.createdAt,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.workspaceMembers.workspaceId))
      .where(eq(schema.workspaceMembers.userId, actor.id))
      .orderBy(desc(schema.workspaces.updatedAt))

    if (rows.length === 0) {
      return []
    }

    const workspaceIds = rows.map((row) => row.id)
    const counts = await db
      .select({
        workspaceId: schema.workspaceMembers.workspaceId,
        memberCount: count(),
      })
      .from(schema.workspaceMembers)
      .where(inArray(schema.workspaceMembers.workspaceId, workspaceIds))
      .groupBy(schema.workspaceMembers.workspaceId)

    const countByWorkspace = new Map(
      counts.map((row) => [row.workspaceId, Number(row.memberCount)]),
    )

    return rows.map((row) => workspaceSummary(row, countByWorkspace.get(row.id) ?? 1))
  }

  async function createWorkspace(
    actor: Actor,
    input: CreateWorkspaceInput,
  ): Promise<WorkspaceSummary> {
    const currentTime = now()

    const workspace = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(schema.workspaces)
        .values({
          name: input.name,
          createdBy: actor.id,
          createdAt: currentTime,
          updatedAt: currentTime,
        })
        .returning({
          id: schema.workspaces.id,
          name: schema.workspaces.name,
          createdAt: schema.workspaces.createdAt,
        })

      const created = inserted[0]

      if (!created) {
        throw new Error('Workspace insert returned no row')
      }

      await tx.insert(schema.workspaceMembers).values({
        workspaceId: created.id,
        userId: actor.id,
        role: 'owner',
        createdAt: currentTime,
      })

      return created
    })

    return workspaceSummary({ ...workspace, role: 'owner' }, 1)
  }

  async function getWorkspaceDetail(actor: Actor, workspaceId: string): Promise<WorkspaceDetail> {
    const access = await requireWorkspaceRole(db, actor, workspaceId, 'viewer')

    const memberRows = await db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.workspaceMembers.role,
        joinedAt: schema.workspaceMembers.createdAt,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.workspaceMembers.userId))
      .where(eq(schema.workspaceMembers.workspaceId, workspaceId))
      .orderBy(asc(schema.workspaceMembers.createdAt))

    const members: WorkspaceMemberView[] = memberRows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      joinedAt: row.joinedAt.toISOString(),
    }))

    let pendingInvites: WorkspaceInviteView[] = []

    if (access.role === 'owner') {
      const inviteRows = await db
        .select({
          id: schema.invites.id,
          email: schema.invites.email,
          role: schema.invites.role,
          expiresAt: schema.invites.expiresAt,
          createdAt: schema.invites.createdAt,
        })
        .from(schema.invites)
        .where(
          and(
            eq(schema.invites.workspaceId, workspaceId),
            isNull(schema.invites.acceptedAt),
            gt(schema.invites.expiresAt, now()),
          ),
        )
        .orderBy(desc(schema.invites.createdAt))

      pendingInvites = inviteRows.map(inviteView)
    }

    return {
      workspace: {
        id: access.workspace.id,
        name: access.workspace.name,
        createdAt: access.workspace.createdAt.toISOString(),
      },
      role: access.role,
      members,
      pendingInvites,
    }
  }

  async function updateWorkspace(
    actor: Actor,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<void> {
    await requireWorkspaceOwner(db, actor, workspaceId)
    await db
      .update(schema.workspaces)
      .set({ name: input.name, updatedAt: now() })
      .where(eq(schema.workspaces.id, workspaceId))
  }

  async function deleteWorkspace(actor: Actor, workspaceId: string): Promise<void> {
    await requireWorkspaceOwner(db, actor, workspaceId)
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId))
  }

  async function createInvite(
    actor: Actor,
    workspaceId: string,
    input: CreateInviteInput,
  ): Promise<WorkspaceInviteView> {
    const access = await requireWorkspaceOwner(db, actor, workspaceId)
    const email = input.email.toLowerCase()
    const currentTime = now()

    const existingMember = await db
      .select({ userId: schema.users.id })
      .from(schema.workspaceMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.workspaceMembers.userId))
      .where(
        and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.users.email, email)),
      )
      .limit(1)

    if (existingMember.length > 0) {
      throw conflict('That person is already a member of this workspace')
    }

    const pending = await db
      .select({ id: schema.invites.id })
      .from(schema.invites)
      .where(
        and(
          eq(schema.invites.workspaceId, workspaceId),
          eq(schema.invites.email, email),
          isNull(schema.invites.acceptedAt),
          gt(schema.invites.expiresAt, currentTime),
        ),
      )
      .limit(1)

    if (pending.length > 0) {
      throw conflict('An invite is already pending for this email')
    }

    const token = createOpaqueToken()
    const tokenHash = hashOpaqueToken(token)
    const expiresAt = new Date(currentTime.getTime() + INVITE_TTL_MS)

    const inserted = await db
      .insert(schema.invites)
      .values({
        workspaceId,
        email,
        role: input.role,
        tokenHash,
        invitedBy: actor.id,
        expiresAt,
        createdAt: currentTime,
      })
      .returning({
        id: schema.invites.id,
        email: schema.invites.email,
        role: schema.invites.role,
        expiresAt: schema.invites.expiresAt,
        createdAt: schema.invites.createdAt,
      })

    const invite = inserted[0]

    if (!invite) {
      throw new Error('Invite insert returned no row')
    }

    const inviteUrl = `${appBaseUrl(env.APP_URL)}/invite/${encodeURIComponent(token)}`
    const text = `${actor.name} invited you to ${access.workspace.name} on Inkwell as ${toAssignableRole(invite.role)}.\n\nAccept the invite:\n${inviteUrl}\n\nThis link expires in 7 days.`
    const html = `<p>${escapeHtml(actor.name)} invited you to <strong>${escapeHtml(access.workspace.name)}</strong> on Inkwell as ${toAssignableRole(invite.role)}.</p><p><a href="${escapeHtml(inviteUrl)}">Accept the invite</a></p><p>This link expires in 7 days.</p>`

    try {
      await mailer.send({
        to: email,
        subject: `Join ${access.workspace.name} on Inkwell`,
        text,
        html,
      })
    } catch (error) {
      await db.delete(schema.invites).where(eq(schema.invites.id, invite.id))
      throw emailFailed('The invite email could not be sent. Try again shortly.', error)
    }

    return inviteView(invite)
  }

  async function revokeInvite(actor: Actor, workspaceId: string, inviteId: string): Promise<void> {
    await requireWorkspaceOwner(db, actor, workspaceId)
    const deleted = await db
      .delete(schema.invites)
      .where(and(eq(schema.invites.id, inviteId), eq(schema.invites.workspaceId, workspaceId)))
      .returning({ id: schema.invites.id })

    if (deleted.length === 0) {
      throw notFound('Invite not found')
    }
  }

  async function getInvitePreview(token: string): Promise<InvitePreview> {
    const rows = await db
      .select({
        email: schema.invites.email,
        role: schema.invites.role,
        expiresAt: schema.invites.expiresAt,
        workspaceName: schema.workspaces.name,
        inviterName: schema.users.name,
      })
      .from(schema.invites)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invites.workspaceId))
      .leftJoin(schema.users, eq(schema.users.id, schema.invites.invitedBy))
      .where(
        and(
          eq(schema.invites.tokenHash, hashOpaqueToken(token)),
          isNull(schema.invites.acceptedAt),
          gt(schema.invites.expiresAt, now()),
        ),
      )
      .limit(1)

    const invite = rows[0]

    if (!invite) {
      throw notFound('This invite is invalid, expired, or already used')
    }

    return {
      workspaceName: invite.workspaceName,
      inviterName: invite.inviterName ?? 'A teammate',
      email: invite.email,
      role: toAssignableRole(invite.role),
      expiresAt: invite.expiresAt.toISOString(),
    }
  }

  async function acceptInvite(
    actor: Actor,
    token: string,
  ): Promise<{ workspaceId: string; workspaceName: string; role: WorkspaceRole }> {
    const currentTime = now()
    const tokenHash = hashOpaqueToken(token)

    return db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: schema.invites.id,
          email: schema.invites.email,
          role: schema.invites.role,
          expiresAt: schema.invites.expiresAt,
          workspaceId: schema.workspaces.id,
          workspaceName: schema.workspaces.name,
        })
        .from(schema.invites)
        .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invites.workspaceId))
        .where(
          and(
            eq(schema.invites.tokenHash, tokenHash),
            isNull(schema.invites.acceptedAt),
            gt(schema.invites.expiresAt, currentTime),
          ),
        )
        .limit(1)
        .for('update')

      const invite = rows[0]

      if (!invite) {
        throw notFound('This invite is invalid, expired, or already used')
      }

      if (invite.email.toLowerCase() !== actor.email.toLowerCase()) {
        throw forbidden(`This invite was sent to ${invite.email}`)
      }

      const existing = await tx
        .select({ role: schema.workspaceMembers.role })
        .from(schema.workspaceMembers)
        .where(
          and(
            eq(schema.workspaceMembers.workspaceId, invite.workspaceId),
            eq(schema.workspaceMembers.userId, actor.id),
          ),
        )
        .limit(1)

      let role = invite.role

      if (existing.length === 0) {
        await tx.insert(schema.workspaceMembers).values({
          workspaceId: invite.workspaceId,
          userId: actor.id,
          role: invite.role,
          createdAt: currentTime,
        })
      } else {
        role = existing[0]?.role ?? invite.role
      }

      await tx
        .update(schema.invites)
        .set({ acceptedAt: currentTime })
        .where(eq(schema.invites.id, invite.id))

      return {
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspaceName,
        role,
      }
    })
  }

  async function changeMemberRole(
    actor: Actor,
    workspaceId: string,
    userId: string,
    role: AssignableRole,
  ): Promise<void> {
    await requireWorkspaceOwner(db, actor, workspaceId)

    const targetRows = await db
      .select({ role: schema.workspaceMembers.role })
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      )
      .limit(1)

    const target = targetRows[0]

    if (!target) {
      throw notFound('Member not found')
    }

    if (target.role === 'owner') {
      throw forbidden('The workspace owner’s role cannot be changed')
    }

    await db
      .update(schema.workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      )
  }

  async function removeMember(actor: Actor, workspaceId: string, userId: string): Promise<void> {
    await requireWorkspaceOwner(db, actor, workspaceId)

    const targetRows = await db
      .select({ role: schema.workspaceMembers.role })
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      )
      .limit(1)

    const target = targetRows[0]

    if (!target) {
      throw notFound('Member not found')
    }

    if (target.role === 'owner') {
      throw forbidden('The workspace owner cannot be removed')
    }

    await db
      .delete(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      )
  }

  async function leaveWorkspace(actor: Actor, workspaceId: string): Promise<void> {
    const access = await requireWorkspaceRole(db, actor, workspaceId, 'viewer')

    if (access.role === 'owner') {
      throw forbidden('Transfer ownership before leaving this workspace')
    }

    await db
      .delete(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, actor.id),
        ),
      )
  }

  return {
    listWorkspaces,
    createWorkspace,
    getWorkspaceDetail,
    updateWorkspace,
    deleteWorkspace,
    createInvite,
    revokeInvite,
    getInvitePreview,
    acceptInvite,
    changeMemberRole,
    removeMember,
    leaveWorkspace,
  }
}

export type WorkspaceService = ReturnType<typeof createWorkspaceService>
