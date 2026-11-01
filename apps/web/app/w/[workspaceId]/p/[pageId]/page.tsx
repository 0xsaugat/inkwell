import { AppError } from '@inkwell/core'
import { PageControls } from '@/components/page-controls'
import { RoleBadge } from '@/components/role-badge'
import { coverGradient } from '@/lib/hierarchy-ui'
import { getServices } from '@/lib/services'
import { getWorkspaceView } from '@/lib/workspace-data'
import type { PageNode } from '@inkwell/shared'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Page' }

export default async function PageView({
  params,
}: {
  params: Promise<{ workspaceId: string; pageId: string }>
}) {
  const { workspaceId, pageId } = await params
  const { actor, hierarchy } = await getWorkspaceView(workspaceId)

  let detail

  try {
    detail = await getServices().hierarchy.getPageDetail(actor, workspaceId, pageId)
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound()
    }

    throw error
  }

  const sections = hierarchy.notebooks.flatMap((notebook) =>
    notebook.sections.map((section) => ({
      id: section.id,
      name: section.name,
      notebookName: notebook.name,
    })),
  )
  const gradient = coverGradient(detail.page.cover)
  const updatedLabel = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(detail.page.updatedAt))

  return (
    <main className="mx-auto w-full max-w-5xl">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-ink-soft"
      >
        {detail.notebook && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">{detail.notebook.icon ?? '📚'}</span>
            {detail.notebook.name}
          </span>
        )}
        {detail.notebook && detail.section && <span aria-hidden="true">/</span>}
        {detail.section && (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: detail.section.color }}
            />
            {detail.section.name}
          </span>
        )}
        {detail.ancestors.map((ancestor) => (
          <span key={ancestor.id} className="inline-flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <Link
              href={`/w/${workspaceId}/p/${ancestor.id}`}
              className="max-w-40 truncate rounded-sm transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {ancestor.title}
            </Link>
          </span>
        ))}
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="max-w-52 truncate text-ink">
          {detail.page.title}
        </span>
      </nav>

      <article className="mt-5 overflow-hidden rounded-3xl border border-line bg-paper-raised">
        {gradient && (
          <div
            className="h-32 sm:h-44"
            style={{ backgroundImage: gradient }}
            aria-hidden="true"
          />
        )}
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="text-4xl leading-none" aria-hidden="true">
                {detail.page.icon ?? '📄'}
              </span>
              <div className="min-w-0">
                <h1 className="text-balance font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
                  {detail.page.title}
                </h1>
                <p className="mt-2 text-xs text-ink-soft">Updated {updatedLabel}</p>
              </div>
            </div>
            <RoleBadge role={detail.role} />
          </div>
        </div>
      </article>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          <section
            aria-labelledby="child-pages-heading"
            className="rounded-2xl border border-line bg-paper-raised p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="child-pages-heading" className="font-serif text-2xl tracking-[-0.02em]">
                Nested pages
              </h2>
              <span className="text-xs text-ink-soft">
                {detail.page.children.length === 1
                  ? '1 child'
                  : `${detail.page.children.length} children`}
              </span>
            </div>

            {detail.page.children.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                No child pages yet. Editors can add one from the page panel; children stay attached
                when this page moves.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {detail.page.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/w/${workspaceId}/p/${child.id}`}
                      className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true">{child.icon ?? '📄'}</span>
                        <span className="truncate font-medium">{child.title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {countDescendants(child) > 0
                          ? `${countDescendants(child)} nested`
                          : 'Open →'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="page-body-heading"
            className="rounded-2xl border border-dashed border-line bg-paper-raised/60 p-6 sm:p-9"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              M3 · Flow editor
            </p>
            <h2 id="page-body-heading" className="mt-3 font-serif text-3xl tracking-[-0.03em]">
              The page body is next.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
              Blocks, slash commands, page links, and collaborative editing arrive in the next
              milestone. The hierarchy around the page is ready now.
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <PageControls
            workspaceId={workspaceId}
            page={detail.page}
            role={detail.role}
            favorite={detail.favorite}
            sectionId={detail.section?.id ?? null}
            sections={sections}
          />
        </aside>
      </div>
    </main>
  )
}

function countDescendants(page: PageNode): number {
  return page.children.reduce((total, child) => total + 1 + countDescendants(child), 0)
}
