import type { WorkspaceRole } from '@inkwell/shared'
import { clsx } from 'clsx'

const labels: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

const styles: Record<WorkspaceRole, string> = {
  owner: 'bg-accent-soft text-accent',
  editor: 'bg-success/10 text-success',
  viewer: 'bg-paper text-ink-soft border border-line',
}

export function RoleBadge({ role, className }: { role: WorkspaceRole; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
        styles[role],
        className,
      )}
    >
      {labels[role]}
    </span>
  )
}

export function roleLabel(role: WorkspaceRole): string {
  return labels[role]
}
