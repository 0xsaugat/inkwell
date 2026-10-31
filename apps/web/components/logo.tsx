import Link from 'next/link'
import { clsx } from 'clsx'

type LogoProps = {
  href?: string
  tone?: 'ink' | 'paper'
  compact?: boolean
}

export function Logo({ href = '/', tone = 'ink', compact = false }: LogoProps) {
  return (
    <Link
      href={href}
      className={clsx(
        'group inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4',
        tone === 'ink' ? 'focus-visible:outline-accent' : 'focus-visible:outline-paper',
      )}
      aria-label="Inkwell home"
    >
      <span
        className={clsx(
          'grid size-9 place-items-center rounded-xl font-serif text-lg shadow-sm transition-transform group-hover:-rotate-2',
          tone === 'ink' ? 'bg-ink text-paper' : 'bg-paper text-ink',
        )}
      >
        I
      </span>
      {!compact && (
        <span
          className={clsx(
            'text-sm font-semibold uppercase tracking-[0.22em]',
            tone === 'ink' ? 'text-ink' : 'text-paper',
          )}
        >
          Inkwell
        </span>
      )}
    </Link>
  )
}
