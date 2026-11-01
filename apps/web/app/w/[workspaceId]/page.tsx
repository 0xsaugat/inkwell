import { AppError } from '@inkwell/core'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppHeader, WorkspaceBreadcrumb } from '@/components/app-header'
import { RoleBadge } from '@/components/role-badge'
import { MembersPanel } from '@/components/workspace-members'
import { WorkspaceSettings } from '@/components/workspace-settings'
import { requireActor } from '@/lib/auth'
import { getServices } from '@/lib/services'

export const metadata: Metadata = { title: 'Workspace' }
export const dynamic = 'force-dynamic'

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const actor = await requireActor(`/w/${workspaceId}`)

  let detail

  try {
    detail = await getServices().workspaces.getWorkspaceDetail(actor, workspaceId)
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound()
    }

    throw error
  }

  const createdLabel = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(detail.workspace.createdAt))

  return (
    <div className="relative min-h-dvh">
      <div
        className="ink-wash pointer-events-none absolute inset-x-0 top-0 h-[30rem]"
        aria-hidden="true"
      />
      <div className="relative">
        <AppHeader
          actor={actor}
          breadcrumb={
            <WorkspaceBreadcrumb name={detail.workspace.name} href={`/w/${workspaceId}`} />
          }
        />

        <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 sm:px-10 lg:pt-14">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-sm text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span aria-hidden="true">←</span>
            All workspaces
          </Link>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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
              <span className="font-medium text-ink">Milestone 1</span> · people and access
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="space-y-6">
              <MembersPanel
                workspaceId={workspaceId}
                role={detail.role}
                currentUserId={actor.id}
                members={detail.members}
                pendingInvites={detail.pendingInvites}
              />

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
                <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-soft">
                      Arriving next · M2
                    </p>
                    <h2 className="mt-3 font-serif text-3xl tracking-[-0.03em]">
                      Notebooks with a spine.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-paper/65">
                      Colored sections, nested pages, drag-and-drop order, covers, favorites, and a
                      trash you can undo. The structure that turns a workspace into a thinking
                      space.
                    </p>
                  </div>

                  <div className="flex items-end gap-2" aria-hidden="true">
                    {['#D9A441', '#6E8B74', '#8A6FA8'].map((color, index) => (
                      <div
                        key={color}
                        className="flex h-32 w-20 flex-col gap-2 rounded-t-xl border border-paper/10 bg-paper/5 p-3"
                        style={{ transform: `translateY(${index * 8}px)` }}
                      >
                        <span className="h-2 w-8 rounded-full" style={{ backgroundColor: color }} />
                        <span className="h-1.5 w-full rounded-full bg-paper/25" />
                        <span className="h-1.5 w-3/4 rounded-full bg-paper/20" />
                        <span className="h-1.5 w-5/6 rounded-full bg-paper/15" />
                        <span className="mt-auto h-1.5 w-1/2 rounded-full bg-paper/15" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
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
      </div>
    </div>
  )
}
