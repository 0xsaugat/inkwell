'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError } from './form-field'

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setPending(true)
    setError(null)

    try {
      const result = await apiFetch<{ workspaceId: string }>(
        `/api/invites/${encodeURIComponent(token)}/accept`,
        { method: 'POST' },
      )
      router.push(`/w/${result.workspaceId}`)
    } catch (acceptError) {
      setError(errorMessage(acceptError))
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? 'Joining…' : 'Accept invite'}
        {!pending && (
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        )}
      </button>
    </div>
  )
}
