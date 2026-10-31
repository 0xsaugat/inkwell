import type { WorkspaceSummary } from '@inkwell/shared'
import Link from 'next/link'
import { RoleBadge } from './role-badge'

export function WorkspaceCard({ workspace }: { workspace: WorkspaceSummary }) {
  const memberLabel = workspace.memberCount === 1 ? '1 member' : `${workspace.memberCount} members`

  return (
    <Link
      href={`/w/${workspace.id}`}
      className="group flex flex-col justify-between rounded-2xl border border-line bg-paper-raised p-6 shadow-[0_20px_60px_-50px_rgba(27,36,48,0.6)] transition-all hover:-translate-y-1 hover:border-ink-soft/40 hover:shadow-[0_28px_70px_-45px_rgba(27,36,48,0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft font-serif text-xl text-accent">
            {workspace.name.trim().charAt(0).toUpperCase() || 'W'}
          </span>
          <RoleBadge role={workspace.role} />
        </div>
        <h2 className="mt-6 font-serif text-2xl tracking-[-0.02em]">{workspace.name}</h2>
        <p className="mt-2 text-sm text-ink-soft">{memberLabel}</p>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-sm text-ink-soft">
        <span>Open workspace</span>
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  )
}
