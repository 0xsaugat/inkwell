import { randomUUID } from 'node:crypto'
import { closeDb, getDb } from '@inkwell/db'
import { afterAll, describe, expect, it } from 'vitest'
import { requireWorkspaceWrite } from '../authz'
import { createAuthService } from '../auth/service'
import { getEnv } from '../env'
import type { ServiceDeps } from '../service-context'
import { MemoryMailer, extractInviteToken } from '../testing/memory-mailer'
import { createWorkspaceService } from './service'

const mailer = new MemoryMailer()
const db = getDb()
const env = getEnv()
const deps: ServiceDeps = { db, env, mailer }
const auth = createAuthService(deps)
const workspaces = createWorkspaceService(deps)

function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`
}

async function signUp(prefix: string) {
  const email = uniqueEmail(prefix)
  const result = await auth.signUp({
    name: `${prefix} user`,
    email,
    password: 'workspace-password-123',
  })

  return { email, user: result.user }
}

afterAll(async () => {
  await closeDb()
})

describe('workspace service integration', () => {
  it('puts two users in one workspace and enforces viewer immutability', async () => {
    const owner = await signUp('owner')
    const viewer = await signUp('viewer')

    const workspace = await workspaces.createWorkspace(owner.user, { name: 'Field Notes' })
    expect(workspace.role).toBe('owner')

    await workspaces.createInvite(owner.user, workspace.id, {
      email: viewer.email,
      role: 'viewer',
    })
    const inviteToken = extractInviteToken(mailer.lastTo(viewer.email).text)
    const preview = await workspaces.getInvitePreview(inviteToken)
    expect(preview.workspaceName).toBe('Field Notes')
    expect(preview.role).toBe('viewer')

    const accepted = await workspaces.acceptInvite(viewer.user, inviteToken)
    expect(accepted.workspaceId).toBe(workspace.id)

    const ownerDetail = await workspaces.getWorkspaceDetail(owner.user, workspace.id)
    expect(ownerDetail.members).toHaveLength(2)
    expect(ownerDetail.pendingInvites).toHaveLength(0)

    const viewerDetail = await workspaces.getWorkspaceDetail(viewer.user, workspace.id)
    expect(viewerDetail.role).toBe('viewer')
    expect(viewerDetail.pendingInvites).toHaveLength(0)

    await expect(
      workspaces.updateWorkspace(viewer.user, workspace.id, { name: 'Hijacked' }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      workspaces.createInvite(viewer.user, workspace.id, {
        email: uniqueEmail('blocked'),
        role: 'viewer',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      workspaces.changeMemberRole(viewer.user, workspace.id, owner.user.id, 'viewer'),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      workspaces.removeMember(viewer.user, workspace.id, owner.user.id),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(workspaces.deleteWorkspace(viewer.user, workspace.id)).rejects.toMatchObject({
      code: 'forbidden',
    })
    await expect(requireWorkspaceWrite(db, viewer.user, workspace.id)).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('lets an owner promote a viewer and remove members', async () => {
    const owner = await signUp('promote-owner')
    const member = await signUp('promote-member')

    const workspace = await workspaces.createWorkspace(owner.user, { name: 'Promotion' })
    await workspaces.createInvite(owner.user, workspace.id, {
      email: member.email,
      role: 'viewer',
    })
    const token = extractInviteToken(mailer.lastTo(member.email).text)
    await workspaces.acceptInvite(member.user, token)

    await workspaces.changeMemberRole(owner.user, workspace.id, member.user.id, 'editor')
    const access = await requireWorkspaceWrite(db, member.user, workspace.id)
    expect(access.role).toBe('editor')

    await expect(
      workspaces.updateWorkspace(member.user, workspace.id, { name: 'Still not allowed' }),
    ).rejects.toMatchObject({ code: 'forbidden' })

    await workspaces.removeMember(owner.user, workspace.id, member.user.id)
    await expect(workspaces.getWorkspaceDetail(member.user, workspace.id)).rejects.toMatchObject({
      code: 'not_found',
    })
  })

  it('protects the owner role and validates invite ownership', async () => {
    const owner = await signUp('guard-owner')
    const other = await signUp('guard-other')

    const workspace = await workspaces.createWorkspace(owner.user, { name: 'Guards' })

    await expect(
      workspaces.removeMember(owner.user, workspace.id, owner.user.id),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      workspaces.changeMemberRole(owner.user, workspace.id, owner.user.id, 'viewer'),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(workspaces.leaveWorkspace(owner.user, workspace.id)).rejects.toMatchObject({
      code: 'forbidden',
    })

    await workspaces.createInvite(owner.user, workspace.id, {
      email: other.email,
      role: 'editor',
    })
    const token = extractInviteToken(mailer.lastTo(other.email).text)

    await expect(
      workspaces.createInvite(owner.user, workspace.id, {
        email: other.email,
        role: 'viewer',
      }),
    ).rejects.toMatchObject({ code: 'conflict' })

    const outsider = await signUp('guard-outsider')
    await expect(workspaces.acceptInvite(outsider.user, token)).rejects.toMatchObject({
      code: 'forbidden',
    })

    await workspaces.acceptInvite(other.user, token)
    await expect(workspaces.getWorkspaceDetail(other.user, workspace.id)).resolves.toMatchObject({
      role: 'editor',
    })
  })

  it('revokes invites and removes access when a member leaves', async () => {
    const owner = await signUp('revoke-owner')
    const invitee = await signUp('revoke-invitee')

    const workspace = await workspaces.createWorkspace(owner.user, { name: 'Revocations' })

    const invite = await workspaces.createInvite(owner.user, workspace.id, {
      email: invitee.email,
      role: 'viewer',
    })
    const token = extractInviteToken(mailer.lastTo(invitee.email).text)
    await workspaces.revokeInvite(owner.user, workspace.id, invite.id)

    await expect(workspaces.getInvitePreview(token)).rejects.toMatchObject({
      code: 'not_found',
    })

    await workspaces.createInvite(owner.user, workspace.id, {
      email: invitee.email,
      role: 'viewer',
    })
    const freshToken = extractInviteToken(mailer.lastTo(invitee.email).text)
    await workspaces.acceptInvite(invitee.user, freshToken)

    await expect(
      workspaces.revokeInvite(invitee.user, workspace.id, invite.id),
    ).rejects.toMatchObject({ code: 'forbidden' })

    await workspaces.leaveWorkspace(invitee.user, workspace.id)
    await expect(workspaces.getWorkspaceDetail(invitee.user, workspace.id)).rejects.toMatchObject({
      code: 'not_found',
    })
  })

  it('deletes a workspace for everyone when the owner asks', async () => {
    const owner = await signUp('delete-owner')
    const member = await signUp('delete-member')

    const workspace = await workspaces.createWorkspace(owner.user, { name: 'Temporary' })
    await workspaces.createInvite(owner.user, workspace.id, {
      email: member.email,
      role: 'editor',
    })
    await workspaces.acceptInvite(member.user, extractInviteToken(mailer.lastTo(member.email).text))

    await workspaces.deleteWorkspace(owner.user, workspace.id)

    await expect(workspaces.getWorkspaceDetail(owner.user, workspace.id)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(workspaces.getWorkspaceDetail(member.user, workspace.id)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(workspaces.listWorkspaces(owner.user)).resolves.toEqual([])
  })
})
