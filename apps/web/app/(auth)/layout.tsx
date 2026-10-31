import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="ink-wash pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden bg-ink p-10 text-paper lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '52px 52px',
              maskImage: 'radial-gradient(ellipse 90% 80% at 20% 20%, black, transparent 80%)',
            }}
            aria-hidden="true"
          />
          <Logo tone="paper" />
          <div className="relative max-w-sm">
            <p className="font-serif text-4xl leading-[1.05] tracking-[-0.03em] xl:text-5xl">
              A quiet place for <span className="italic text-accent-soft">loud ideas.</span>
            </p>
            <p className="mt-6 text-sm leading-7 text-paper/70">
              Think on a page, shape it into knowledge. Inkwell keeps the messy middle and the tidy
              index in the same workspace.
            </p>
          </div>
          <ul className="relative space-y-3 text-sm text-paper/70">
            <li className="flex items-center gap-3">
              <span className="h-px w-6 bg-accent-soft" aria-hidden="true" />
              Flow pages for thinking out loud
            </li>
            <li className="flex items-center gap-3">
              <span className="h-px w-6 bg-accent-soft" aria-hidden="true" />
              Canvas space for spatial work
            </li>
            <li className="flex items-center gap-3">
              <span className="h-px w-6 bg-accent-soft" aria-hidden="true" />
              One home for every teammate
            </li>
          </ul>
        </aside>

        <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo />
            </div>
            <Link
              href="/"
              className="rounded-full border border-line bg-paper-raised/60 px-3.5 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Back home
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md">{children}</div>
          </div>

          <p className="text-center text-xs text-ink-soft">
            Inkwell · notes for the messy middle
          </p>
        </section>
      </div>
    </main>
  )
}
