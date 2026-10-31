'use client'

import type {
  AssignableRole,
  WorkspaceInviteView,
  WorkspaceMemberView,
  WorkspaceRole,
} from '@inkwell/shared'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, inputClassName } from './form-field'
import { RoleBadge } from './role-badge'

type MembersPanelProps = {
  workspaceId: string
  role: WorkspaceRole
  currentUserId: string
  members: WorkspaceMemberView[]
  pendingInvites: WorkspaceInviteView[]
}

const selectClassName =
  'rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-60'

export function MembersPanel({
  workspaceId,
  role,
  currentUserId,
  members,
  pendingInvites,
}: MembersPanelProps) {
  const router = useRouter()
  const isOwner = role === 'owner'
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<void>, successMessage: string) {
    setPendingKey(key)
    setError(null)
    setNotice(null)

    try {
      await action()
      setNotice(successMessage)
      router.refresh()
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setPendingKey(null)
      setConfirmRemoveId(null)
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '')
    const inviteRole = String(data.get('role') ?? 'editor') as AssignableRole

    await run(
      'invite',
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/invites`, {
          method: 'POST',
          body: JSON.stringify({ email, role: inviteRole }),
        })
        form.reset()
      },
      `Invite sent to ${email}`,
    )
  }

  async function changeRole(userId: string, nextRole: AssignableRole) {
    await run(
      `role:${userId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ role: nextRole }),
        })
      },
      'Member role updated',
    )
  }

  async function removeMember(userId: string, name: string) {
    if (confirmRemoveId !== userId) {
      setConfirmRemoveId(userId)
      return
    }

    await run(
      `remove:${userId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
          method: 'DELETE',
        })
      },
      `${name} was removed from the workspace`,
    )
  }

  async function revokeInvite(inviteId: string, email: string) {
    await run(
      `invite:${inviteId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/invites/${inviteId}`, {
          method: 'DELETE',
        })
      },
      `Invite for ${email} revoked`,
    )
  }

  return (
    <section
      className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8"
      aria-labelledby="members-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">People</p>
          <h2 id="members-heading" className="mt-2 font-serif text-3xl tracking-[-0.03em]">
            In this workspace
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {members.length === 1 ? '1 member' : `${members.length} members`}
            {pendingInvites.length > 0 &&
              ` · ${pendingInvites.length} pending ${pendingInvites.length === 1 ? 'invite' : 'invites'}`}
          </p>
        </div>
        <RoleBadge role={role} />
      </div>

      {(error || notice) && (
        <div className="mt-5 space-y-3">
          <FormError message={error} />
          {notice && (
            <div
              role="status"
              className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
            >
              {notice}
            </div>
          )}
        </div>
      )}

      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <caption className="sr-only">Workspace members and their roles</caption>
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              <th scope="col" className="pb-3 pr-4 font-semibold">
                Person
              </th>
              <th scope="col" className="pb-3 pr-4 font-semibold">
                Role
              </th>
              <th scope="col" className="pb-3 text-right font-semibold">
                <span className="sr-only">Actions</span>
                Manage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId
              const canManage = isOwner && member.role !== 'owner'
              const rowPending = pendingKey?.endsWith(member.userId) ?? false

              return (
                <tr key={member.userId}>
                  <td className="py-4 pr-4">
                    <div className="font-medium">
                      {member.name}
                      {isSelf && <span className="ml-2 text-xs text-ink-soft">(you)</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-soft">{member.email}</div>
                  </td>
                  <td className="py-4 pr-4">
                    {canManage ? (
                      <>
                        <label htmlFor={`role-${member.userId}`} className="sr-only">
                          Role for {member.name}
                        </label>
                        <select
                          id={`role-${member.userId}`}
                          value={member.role}
                          disabled={rowPending}
                          onChange={(event) =>
                            changeRole(member.userId, event.target.value as AssignableRole)
                          }
                          className={selectClassName}
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => removeMember(member.userId, member.name)}
                        disabled={rowPending}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                      >
                        {pendingKey === `remove:${member.userId}`
                          ? 'Removing…'
                          : confirmRemoveId === member.userId
                            ? 'Confirm remove'
                            : 'Remove'}
                      </button>
                    ) : (
                      <span className="text-xs text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="mt-8 border-t border-line pt-7">
          <h3 className="font-serif text-2xl tracking-[-0.02em]">Invite someone</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            They will receive an email with a private link. Invites expire after seven days, and
            only owners can send them.
          </p>
          <form className="mt-5 space-y-3" onSubmit={handleInvite}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="invite-email" className="sr-only">
                Email address
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="teammate@example.com"
                className={inputClassName}
              />
              <label htmlFor="invite-role" className="sr-only">
                Invite role
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="editor"
                className="rounded-xl border border-line bg-paper-raised px-3 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 sm:w-32"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={pendingKey === 'invite'}
                className="shrink-0 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
              >
                {pendingKey === 'invite' ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>

          {pendingInvites.length > 0 && (
            <div className="mt-7">
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                Pending invites
              </h4>
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper">
                {pendingInvites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-ink-soft">{invite.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeInvite(invite.id, invite.email)}
                      disabled={pendingKey === `invite:${invite.id}`}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                    >
                      {pendingKey === `invite:${invite.id}` ? 'Revoking…' : 'Revoke'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!isOwner && (
        <p className="mt-7 border-t border-line pt-5 text-xs leading-5 text-ink-soft">
          Only workspace owners can invite people or change roles. Your access:{' '}
          <strong className="font-medium text-ink">
            {role === 'editor' ? 'you can write' : 'read only'}
          </strong>
          .
        </p>
      )}
    </section>
  )
}
