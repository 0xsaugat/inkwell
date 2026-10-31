import type { Metadata } from 'next'
import { AppHeader } from '@/components/app-header'
import { CreateWorkspaceForm } from '@/components/create-workspace-form'
import { WorkspaceCard } from '@/components/workspace-card'
import { requireActor } from '@/lib/auth'
import { getServices } from '@/lib/services'

export const metadata: Metadata = { title: 'Your workspaces' }
export const dynamic = 'force-dynamic'

export default async function WorkspacesPage() {
  const actor = await requireActor('/app')
  const workspaces = await getServices().workspaces.listWorkspaces(actor)

  return (
    <div className="relative min-h-dvh">
      <div className="ink-wash pointer-events-none absolute inset-x-0 top-0 h-[32rem]" aria-hidden="true" />
      <div className="relative">
        <AppHeader actor={actor} />

        <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-14 sm:px-10 lg:pt-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Your desk
              </p>
              <h1 className="mt-3 font-serif text-5xl tracking-[-0.04em] sm:text-6xl">
                Workspaces
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-ink-soft">
                Every workspace holds its own notebooks, people, and rhythm. Pick one up or start a
                fresh place to think.
              </p>
            </div>
            <div className="w-full max-w-md lg:w-96">
              <CreateWorkspaceForm />
            </div>
          </div>

          {workspaces.length === 0 ? (
            <div className="mt-14 rounded-3xl border border-dashed border-line bg-paper-raised/60 px-8 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft font-serif text-2xl text-accent">
                W
              </span>
              <h2 className="mt-6 font-serif text-3xl tracking-[-0.03em]">A blank desk.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-soft">
                Name your first workspace above. You will be its owner, and you can invite the rest
                of the team in a moment.
              </p>
            </div>
          ) : (
            <section className="mt-12" aria-labelledby="workspace-list-heading">
              <div className="flex items-center justify-between">
                <h2
                  id="workspace-list-heading"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft"
                >
                  {workspaces.length === 1 ? '1 workspace' : `${workspaces.length} workspaces`}
                </h2>
                <p className="text-xs text-ink-soft">M1 · Auth and workspaces</p>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-16 rounded-2xl border border-line bg-paper-raised/60 p-6 text-sm leading-6 text-ink-soft">
            <strong className="font-medium text-ink">What is next:</strong> notebooks, colored
            sections, and nested pages arrive in milestone M2. For now, bring your people in and
            make the workspace feel like yours.
          </div>
        </main>
      </div>
    </div>
  )
}
