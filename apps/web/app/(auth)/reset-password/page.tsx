import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetPasswordForm } from '@/components/reset-password-form'

export const metadata: Metadata = { title: 'Set a new password' }
export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token ?? ''

  if (!token) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Broken link</p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">That link is missing a key.</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Password reset links include a one-time token. Request a fresh email to try again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/forgot-password"
            className="rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Request a new link
          </Link>
          <Link
            href="/signin"
            className="rounded-xl border border-line px-5 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm token={token} />
}
