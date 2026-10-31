import type { SessionUser } from '@inkwell/core'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from './logo'
import { SignOutButton } from './sign-out-button'

type AppHeaderProps = {
  actor: SessionUser
  breadcrumb?: ReactNode
}

export function AppHeader({ actor, breadcrumb }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-10">
        <div className="flex items-center gap-4">
          <Logo href="/app" />
          {breadcrumb && (
            <div className="hidden items-center gap-1 text-sm text-ink-soft sm:flex">
              <span aria-hidden="true" className="text-line">
                /
              </span>
              {breadcrumb}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{actor.name}</p>
            <p className="text-xs leading-tight text-ink-soft">{actor.email}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}

export function WorkspaceBreadcrumb({ name, href }: { name: string; href: string }) {
  return (
    <Link
      href={href}
      className="max-w-52 truncate rounded-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {name}
    </Link>
  )
}
