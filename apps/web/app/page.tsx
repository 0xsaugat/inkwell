import { getHealth } from '@inkwell/core'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const health = await getHealth()
  const online = health.status === 'ok'
  const checkedAt = new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(health.timestamp))

  return (
    <main className="relative min-h-dvh overflow-hidden px-6 py-6 sm:px-10 lg:px-16">
      <div className="ink-wash pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="ink-grid pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-ink font-serif text-lg text-paper shadow-sm">
            I
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.22em]">Inkwell</span>
        </div>
        <span className="rounded-full border border-line bg-paper-raised/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
          Foundations · M0
        </span>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl gap-14 pb-20 pt-20 lg:grid-cols-[1.5fr_0.82fr] lg:items-end lg:pt-32">
        <div>
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />A thinking space that keeps up
          </p>
          <h1 className="max-w-4xl font-serif text-6xl leading-[0.94] tracking-[-0.04em] sm:text-7xl lg:text-[5.1rem]">
            Think in pages.
            <br />
            <span className="italic text-accent xl:whitespace-nowrap">Organise in place.</span>
          </h1>
          <p className="mt-8 max-w-xl text-pretty text-lg leading-8 text-ink-soft">
            Canvas for the half-formed. Sections for the almost-sorted. Databases for the things you
            need to find again. One workspace, two ways of thinking.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              className="group inline-flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              href="/api/health"
            >
              Inspect system health
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
            <span className="text-sm text-ink-soft">Web, database, and realtime foundations</span>
          </div>
        </div>

        <aside
          className="rounded-[1.75rem] border border-line bg-paper-raised/90 p-6 shadow-[0_24px_80px_-48px_rgba(27,36,48,0.55)] backdrop-blur-sm sm:p-7"
          aria-label="System status"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
                Workspace status
              </p>
              <p className="mt-2 font-serif text-3xl tracking-[-0.02em]">
                {online ? 'Stack online' : 'Setup needed'}
              </p>
            </div>
            <span
              className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                online ? 'bg-accent-soft text-accent' : 'bg-paper text-danger'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${online ? 'bg-success' : 'bg-danger'}`}
                aria-hidden="true"
              />
              {online ? 'Healthy' : 'Degraded'}
            </span>
          </div>

          <dl className="mt-7 divide-y divide-line border-y border-line text-sm">
            <div className="flex items-center justify-between py-3.5">
              <dt className="text-ink-soft">Web application</dt>
              <dd className="font-medium">Online</dd>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <dt className="text-ink-soft">PostgreSQL</dt>
              <dd className={online ? 'font-medium' : 'font-medium text-danger'}>
                {health.db === 'ok' ? 'Connected' : 'Unavailable'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <dt className="text-ink-soft">Build</dt>
              <dd className="font-mono text-xs">v{health.version}</dd>
            </div>
          </dl>

          <p className="mt-5 text-xs leading-5 text-ink-soft">
            {online
              ? `Last checked ${checkedAt}. Collaboration, canvas, and databases land in the next milestones.`
              : 'Start the local services with docker compose up -d, then reload this page.'}
          </p>
        </aside>
      </section>

      <footer className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-line pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>Inkwell · notes for the messy middle</p>
        <p>Milestone 0 · Foundations</p>
      </footer>
    </main>
  )
}
