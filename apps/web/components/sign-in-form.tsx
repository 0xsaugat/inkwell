'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, FormField } from './form-field'

export function SignInForm({ next, email = '' }: { next: string; email?: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const data = new FormData(event.currentTarget)

    try {
      await apiFetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
        }),
      })
      window.location.assign(next)
    } catch (submitError) {
      setError(errorMessage(submitError))
      setPending(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Welcome back</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Pick up the thread.</h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">
        Sign in to your workspace. Your notes are exactly where you left them.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
          placeholder="you@example.com"
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
        />

        <div className="flex items-center justify-between gap-4">
          <Link
            href="/forgot-password"
            className="rounded-sm text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Forgot your password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
          {!pending && (
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          )}
        </button>
      </form>

      <p className="mt-7 text-sm text-ink-soft">
        New to Inkwell?{' '}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
