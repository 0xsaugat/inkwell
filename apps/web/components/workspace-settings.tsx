'use client'

import type { WorkspaceRole } from '@inkwell/shared'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, inputClassName } from './form-field'

type WorkspaceSettingsProps = {
  workspaceId: string
  name: string
  role: WorkspaceRole
}

export function WorkspaceSettings({ workspaceId, name, role }: WorkspaceSettingsProps) {
  const router = useRouter()
  const isOwner = role === 'owner'
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function renameWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending('rename')
    setError(null)
    setNotice(null)

    const data = new FormData(event.currentTarget)
    const nextName = String(data.get('name') ?? '')

    try {
      await apiFetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: nextName }),
      })
      setNotice('Workspace name updated')
      router.refresh()
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setPending(null)
    }
  }

  async function removeWorkspace() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setPending('delete')
    setError(null)

    try {
      await apiFetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' })
      router.push('/app')
      router.refresh()
    } catch (actionError) {
      setError(errorMessage(actionError))
      setPending(null)
      setConfirming(false)
    }
  }

  async function leaveWorkspace() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setPending('leave')
    setError(null)

    try {
      await apiFetch(`/api/workspaces/${workspaceId}/leave`, { method: 'POST' })
      router.push('/app')
      router.refresh()
    } catch (actionError) {
      setError(errorMessage(actionError))
      setPending(null)
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-line bg-paper-raised p-6"
        aria-labelledby="settings-heading"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Settings</p>
        <h2 id="settings-heading" className="mt-2 font-serif text-2xl tracking-[-0.02em]">
          Workspace details
        </h2>

        {(error || notice) && (
          <div className="mt-4 space-y-3">
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

        {isOwner ? (
          <form className="mt-5 space-y-3" onSubmit={renameWorkspace}>
            <label htmlFor="rename-workspace" className="sr-only">
              Workspace name
            </label>
            <input
              id="rename-workspace"
              name="name"
              type="text"
              required
              maxLength={80}
              defaultValue={name}
              className={inputClassName}
            />
            <button
              type="submit"
              disabled={pending === 'rename'}
              className="w-full rounded-xl border border-ink px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {pending === 'rename' ? 'Saving…' : 'Rename workspace'}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            Only the workspace owner can rename it. You can still read everything and{' '}
            {role === 'editor' ? 'write pages' : 'follow along'}.
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-danger/25 bg-danger/[0.03] p-6"
        aria-labelledby="danger-heading"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-danger">Careful</p>
        <h2 id="danger-heading" className="mt-2 font-serif text-2xl tracking-[-0.02em]">
          {isOwner ? 'Delete workspace' : 'Leave workspace'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          {isOwner
            ? 'Deleting removes the workspace, its membership, and everything inside it for everyone. This cannot be undone.'
            : 'Leaving removes your access. You will need a new invite to come back.'}
        </p>

        <button
          type="button"
          onClick={isOwner ? removeWorkspace : leaveWorkspace}
          disabled={pending === 'delete' || pending === 'leave'}
          className="mt-5 w-full rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
        >
          {pending === 'delete'
            ? 'Deleting…'
            : pending === 'leave'
              ? 'Leaving…'
              : confirming
                ? isOwner
                  ? 'Confirm delete forever'
                  : 'Confirm leave'
                : isOwner
                  ? 'Delete this workspace'
                  : 'Leave this workspace'}
        </button>

        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="mt-2 w-full rounded-lg px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Keep the workspace
          </button>
        )}
      </section>
    </div>
  )
}
