import { z } from 'zod'
import { emailSchema } from './auth'

export const workspaceRoleSchema = z.enum(['owner', 'editor', 'viewer'])
export const assignableRoleSchema = z.enum(['editor', 'viewer'])

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the workspace a name')
  .max(80, 'Use at most 80 characters')

export const createWorkspaceInputSchema = z.object({
  name: workspaceNameSchema,
})

export const updateWorkspaceInputSchema = z.object({
  name: workspaceNameSchema,
})

export const createInviteInputSchema = z.object({
  email: emailSchema,
  role: assignableRoleSchema.default('editor'),
})

export const updateMemberRoleInputSchema = z.object({
  role: assignableRoleSchema,
})

export const inviteTokenSchema = z.string().min(20).max(200)
export const workspaceIdSchema = z.uuid()
export const inviteIdSchema = z.uuid()
export const memberUserIdSchema = z.uuid()

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>
export type AssignableRole = z.infer<typeof assignableRoleSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>

export type WorkspaceSummary = {
  id: string
  name: string
  role: WorkspaceRole
  memberCount: number
  createdAt: string
}

export type WorkspaceMemberView = {
  userId: string
  name: string
  email: string
  role: WorkspaceRole
  joinedAt: string
}

export type WorkspaceInviteView = {
  id: string
  email: string
  role: AssignableRole
  expiresAt: string
  createdAt: string
}

export type WorkspaceDetail = {
  workspace: {
    id: string
    name: string
    createdAt: string
  }
  role: WorkspaceRole
  members: WorkspaceMemberView[]
  pendingInvites: WorkspaceInviteView[]
}

export type InvitePreview = {
  workspaceName: string
  inviterName: string
  email: string
  role: AssignableRole
  expiresAt: string
}
