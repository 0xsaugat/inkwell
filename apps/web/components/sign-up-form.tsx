'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { PASSWORD_MIN_LENGTH } from '@inkwell/shared'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError, FormField } from './form-field'

export function SignUpForm({ next, email = '' }: { next: string; email?: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          password,
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
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Get started</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
        Make room to think.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">
        Create an account, open a workspace, and invite the people who make the work better.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <FormField
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          placeholder="Your name"
        />
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
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          placeholder="At least 10 characters"
          hint={`Use at least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          placeholder="Repeat your password"
        />

        <button
          type="submit"
          disabled={pending}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? 'Creating account…' : 'Create account'}
          {!pending && (
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          )}
        </button>
      </form>

      <p className="mt-7 text-sm text-ink-soft">
        Already have an account?{' '}
        <Link
          href={`/signin?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
          className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
