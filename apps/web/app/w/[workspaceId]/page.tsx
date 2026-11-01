import { RoleBadge } from '@/components/role-badge'
import { MembersPanel } from '@/components/workspace-members'
import { WorkspaceSettings } from '@/components/workspace-settings'
import { getServices } from '@/lib/services'
import { getWorkspaceView } from '@/lib/workspace-data'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Workspace' }

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { actor, hierarchy } = await getWorkspaceView(workspaceId)
  const detail = await getServices().workspaces.getWorkspaceDetail(actor, workspaceId)

  const createdLabel = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(detail.workspace.createdAt))
  const sectionCount = hierarchy.notebooks.reduce(
    (total, notebook) => total + notebook.sections.length,
    0,
  )
  const pageCount = hierarchy.notebooks.reduce(
    (total, notebook) => total + notebook.pageCount,
    0,
  )

  return (
    <main className="mx-auto w-full max-w-5xl">
      <Link
        href="/app"
        className="inline-flex items-center gap-2 rounded-sm text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">←</span>
        All workspaces
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Workspace
            </p>
            <RoleBadge role={detail.role} />
          </div>
          <h1 className="mt-3 max-w-3xl text-balance font-serif text-5xl tracking-[-0.04em] sm:text-6xl">
            {detail.workspace.name}
          </h1>
          <p className="mt-4 text-sm text-ink-soft">
            {detail.members.length === 1 ? '1 member' : `${detail.members.length} members`} ·
            created {createdLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised/80 px-4 py-3 text-sm text-ink-soft backdrop-blur-sm">
          <span className="font-medium text-ink">Milestone 2</span> · hierarchy and library
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-ink p-7 text-paper sm:p-9">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '44px 44px',
                maskImage:
                  'radial-gradient(ellipse 80% 90% at 80% 20%, black, transparent 75%)',
              }}
              aria-hidden="true"
            />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-soft">
                The library
              </p>
              <h2 className="mt-3 max-w-xl font-serif text-3xl tracking-[-0.03em]">
                Notebooks hold sections. Sections hold pages that nest as deep as you need.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-paper/65">
                Use the library on the left to create a notebook, color its sections, and drag
                pages between them. Covers, icons, favorites, and an undoable trash are all live.
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Notebooks" value={hierarchy.notebooks.length} />
                <Stat label="Sections" value={sectionCount} />
                <Stat label="Pages" value={pageCount} />
                <Stat label="Favorites" value={hierarchy.favorites.length} />
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-paper/60">
                <Link
                  href={`/w/${workspaceId}/trash`}
                  className="rounded-sm font-medium text-accent-soft transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Trash ({hierarchy.trash.length})
                </Link>
                {pageCount === 0 && (
                  <span>Start with a notebook in the library, then add a section.</span>
                )}
              </div>
            </div>
          </section>

          <MembersPanel
            workspaceId={workspaceId}
            role={detail.role}
            currentUserId={actor.id}
            members={detail.members}
            pendingInvites={detail.pendingInvites}
          />
        </div>

        <aside className="lg:sticky lg:top-24">
          <WorkspaceSettings
            workspaceId={workspaceId}
            name={detail.workspace.name}
            role={detail.role}
          />
        </aside>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/5 px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/50">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-2xl">{value}</dd>
    </div>
  )
}
