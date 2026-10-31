'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { PASSWORD_MIN_LENGTH } from '@inkwell/shared'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, FormField, FormSuccess } from './form-field'

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setPending(false)
      return
    }

    try {
      await apiFetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setDone(true)
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">All set</p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">Password updated.</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Every existing session was signed out. Use your new password to continue.
        </p>
        <FormSuccess message="Your account is secure and ready." />
        <Link
          href="/signin"
          className="mt-8 inline-flex rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">New password</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
        Choose a fresh key.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">
        Pick something at least {PASSWORD_MIN_LENGTH} characters long. All other sessions will be
        signed out.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          hint={`Use at least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <FormField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
