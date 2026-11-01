import { AppError } from '@inkwell/core'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AcceptInviteButton } from '@/components/accept-invite'
import { SignOutButton } from '@/components/sign-out-button'
import { getCurrentActor } from '@/lib/auth'
import { getServices } from '@/lib/services'

export const metadata: Metadata = { title: 'Workspace invite' }
export const dynamic = 'force-dynamic'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const actor = await getCurrentActor()

  let preview

  try {
    preview = await getServices().workspaces.getInvitePreview(token)
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 404) {
      throw error
    }
  }

  if (!preview) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Invite</p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">This door has closed.</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          This invite is invalid, has expired, or was already used. Ask a workspace owner for a
          fresh one.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Back home
          </Link>
          <Link
            href="/signin"
            className="rounded-xl border border-line px-5 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const expiresLabel = new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(preview.expiresAt))
  const invitePath = `/invite/${token}`
  const matchingActor = actor?.email.toLowerCase() === preview.email.toLowerCase()

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
        {preview.inviterName} invited you
      </p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
        Join {preview.workspaceName}.
      </h1>
      <p className="mt-4 text-sm leading-6 text-ink-soft">
        You have been invited as an <strong className="font-medium text-ink">{preview.role}</strong>
        . This private link is for <strong className="font-medium text-ink">{preview.email}</strong>{' '}
        and expires {expiresLabel}.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-5">
        {!actor && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-soft">
              Create an account with the invited email, or sign in if you already have one.
            </p>
            <Link
              href={`/signup?email=${encodeURIComponent(preview.email)}&next=${encodeURIComponent(invitePath)}`}
              className="flex w-full items-center justify-center rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Create your account
            </Link>
            <Link
              href={`/signin?email=${encodeURIComponent(preview.email)}&next=${encodeURIComponent(invitePath)}`}
              className="flex w-full items-center justify-center rounded-xl border border-line px-5 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              I already have an account
            </Link>
          </div>
        )}

        {actor && matchingActor && (
          <div className="space-y-4">
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
              Signed in as {actor.email}. This invite is yours.
            </div>
            <AcceptInviteButton token={token} />
          </div>
        )}

        {actor && !matchingActor && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-soft">
              You are signed in as <strong className="font-medium text-ink">{actor.email}</strong>,
              but this invite belongs to{' '}
              <strong className="font-medium text-ink">{preview.email}</strong>.
            </p>
            <SignOutButton
              redirectTo={invitePath}
              label="Sign out and switch account"
              className="w-full rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink hover:text-paper"
            />
            <Link
              href="/app"
              className="block rounded-sm text-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Stay signed in and go to my workspaces
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
