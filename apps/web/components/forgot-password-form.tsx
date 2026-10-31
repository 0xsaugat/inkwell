'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, FormField } from './form-field'

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const data = new FormData(event.currentTarget)

    try {
      await apiFetch('/api/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: String(data.get('email') ?? '') }),
      })
      setSent(true)
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Check your email</p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">The link is on its way.</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          If an Inkwell account exists for that address, a reset link will arrive shortly. It
          expires in 60 minutes. In local development, open Mailpit at{' '}
          <a
            className="text-accent underline underline-offset-4"
            href="http://localhost:8025"
            target="_blank"
            rel="noreferrer"
          >
            localhost:8025
          </a>
          .
        </p>
        <Link
          href="/signin"
          className="mt-8 inline-flex rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Password help</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
        Find your way back.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">
        Enter the email you use for Inkwell and we will send a short-lived reset link.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-7 text-sm text-ink-soft">
        Remembered it?{' '}
        <Link
          href="/signin"
          className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
