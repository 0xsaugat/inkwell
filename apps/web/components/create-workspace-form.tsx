'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, inputClassName } from './form-field'

type CreateWorkspaceResponse = {
  workspace: { id: string }
}

export function CreateWorkspaceForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()

    if (!name) {
      setError('Give the workspace a name')
      setPending(false)
      return
    }

    try {
      const result = await apiFetch<CreateWorkspaceResponse>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      router.push(`/w/${result.workspace.id}`)
    } catch (submitError) {
      setError(errorMessage(submitError))
      setPending(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <FormError message={error} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="workspace-name" className="sr-only">
          Workspace name
        </label>
        <input
          id="workspace-name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="Name a new workspace"
          className={inputClassName}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create workspace'}
        </button>
      </div>
    </form>
  )
}
