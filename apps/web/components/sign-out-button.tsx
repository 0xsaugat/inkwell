'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { apiFetch } from '@/lib/client-api'

type SignOutButtonProps = {
  redirectTo?: string
  label?: string
  className?: string
}

export function SignOutButton({
  redirectTo = '/',
  label = 'Sign out',
  className,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)

    try {
      await apiFetch('/api/auth/signout', { method: 'POST' })
    } finally {
      window.location.assign(redirectTo)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={clsx(
        'rounded-full border border-line px-3.5 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60',
        className,
      )}
    >
      {pending ? 'Signing out…' : label}
    </button>
  )
}
