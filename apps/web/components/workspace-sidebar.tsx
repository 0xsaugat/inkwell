'use client'

import type {
  NotebookView,
  PageLink,
  PageNode,
  SectionView,
  WorkspaceHierarchy,
} from '@inkwell/shared'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { NOTEBOOK_ICONS, SECTION_COLORS } from '@/lib/hierarchy-ui'
import { FormError } from './form-field'

type WorkspaceSidebarProps = {
  workspaceId: string
  hierarchy: WorkspaceHierarchy
}

const smallInputClassName =
  'w-full rounded-lg border border-line bg-paper px-2.5 py-2 text-sm text-ink transition-colors placeholder:text-ink-soft/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15'

const smallButtonClassName =
  'rounded-lg px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'

export function WorkspaceSidebar({ workspaceId, hierarchy }: WorkspaceSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const canEdit = hierarchy.role !== 'viewer'
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showNotebookForm, setShowNotebookForm] = useState(false)
  const [sectionFormFor, setSectionFormFor] = useState<string | null>(null)
  const [pageFormFor, setPageFormFor] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<void>, successMessage?: string) {
    setPending(key)
    setError(null)
    setNotice(null)

    try {
      await action()
      if (successMessage) {
        setNotice(successMessage)
      }
      router.refresh()
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setPending(null)
      setConfirmKey(null)
    }
  }

  async function createNotebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    await run(
      'create-notebook',
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/notebooks`, {
          method: 'POST',
          body: JSON.stringify({
            name: String(data.get('name') ?? ''),
            icon: String(data.get('icon') ?? '') || null,
          }),
        })
        form.reset()
        setShowNotebookForm(false)
      },
      'Notebook created',
    )
  }

  async function updateNotebook(event: FormEvent<HTMLFormElement>, notebookId: string) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    await run(
      `notebook:${notebookId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/notebooks/${notebookId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: String(data.get('name') ?? ''),
            icon: String(data.get('icon') ?? '') || null,
          }),
        })
      },
      'Notebook updated',
    )
  }

  async function deleteNotebook(notebookId: string) {
    if (confirmKey !== `delete-notebook:${notebookId}`) {
      setConfirmKey(`delete-notebook:${notebookId}`)
      return
    }

    await run(
      `notebook:${notebookId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/notebooks/${notebookId}`, {
          method: 'DELETE',
        })
      },
      'Notebook deleted',
    )
  }

  async function createSection(event: FormEvent<HTMLFormElement>, notebookId: string) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    await run(
      `create-section:${notebookId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/sections`, {
          method: 'POST',
          body: JSON.stringify({
            notebookId,
            name: String(data.get('name') ?? ''),
            color: String(data.get('color') ?? SECTION_COLORS[0].value),
          }),
        })
        form.reset()
        setSectionFormFor(null)
      },
      'Section created',
    )
  }

  async function updateSection(event: FormEvent<HTMLFormElement>, sectionId: string) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    await run(
      `section:${sectionId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/sections/${sectionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: String(data.get('name') ?? ''),
            color: String(data.get('color') ?? SECTION_COLORS[0].value),
          }),
        })
      },
      'Section updated',
    )
  }

  async function deleteSection(sectionId: string) {
    if (confirmKey !== `delete-section:${sectionId}`) {
      setConfirmKey(`delete-section:${sectionId}`)
      return
    }

    await run(
      `section:${sectionId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/sections/${sectionId}`, {
          method: 'DELETE',
        })
      },
      'Section deleted',
    )
  }

  async function createPage(event: FormEvent<HTMLFormElement>, section: SectionView) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    await run(
      `create-page:${section.id}`,
      async () => {
        const result = await apiFetch<{ page: PageNode }>(
          `/api/workspaces/${workspaceId}/pages`,
          {
            method: 'POST',
            body: JSON.stringify({
              sectionId: section.id,
              title: String(data.get('title') ?? 'Untitled'),
            }),
          },
        )
        form.reset()
        setPageFormFor(null)
        router.push(`/w/${workspaceId}/p/${result.page.id}`)
      },
      'Page created',
    )
  }

  async function movePage(
    pageId: string,
    target: { sectionId: string; parentPageId: string | null; beforePageId: string | null },
    successMessage = 'Page moved',
  ) {
    await run(
      `move:${pageId}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${pageId}/move`, {
          method: 'POST',
          body: JSON.stringify(target),
        })
      },
      successMessage,
    )
  }

  async function moveRelative(
    page: PageNode,
    siblings: PageNode[],
    offset: -1 | 1,
  ) {
    const index = siblings.findIndex((sibling) => sibling.id === page.id)
    const neighbor = siblings[index + offset]

    if (index === -1 || !neighbor || !page.sectionId) {
      return
    }

    const beforePageId =
      offset === -1 ? neighbor.id : (siblings[index + 2]?.id ?? null)

    await movePage(
      page.id,
      {
        sectionId: page.sectionId,
        parentPageId: page.parentPageId,
        beforePageId,
      },
      'Page reordered',
    )
  }

  async function toggleFavorite(page: { id: string; favorite: boolean }, key: string) {
    await run(
      key,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}/favorite`, {
          method: 'PUT',
          body: JSON.stringify({ favorite: !page.favorite }),
        })
      },
      page.favorite ? 'Removed from favorites' : 'Added to favorites',
    )
  }

  function handleDragStart(event: DragEvent<HTMLElement>, pageId: string) {
    event.dataTransfer.setData('text/inkwell-page', pageId)
    event.dataTransfer.effectAllowed = 'move'
    setDragging(pageId)
  }

  async function handleDrop(
    event: DragEvent<HTMLElement>,
    target: { sectionId: string; parentPageId: string | null },
  ) {
    event.preventDefault()
    const pageId = event.dataTransfer.getData('text/inkwell-page')
    setDragging(null)

    if (!pageId || pageId === target.parentPageId) {
      return
    }

    await movePage(pageId, { ...target, beforePageId: null })
  }

  function allowDrop(event: DragEvent<HTMLElement>) {
    if (!canEdit) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function renderPages(
    pages: PageNode[],
    section: SectionView,
    level: number,
  ): ReactNode {
    return pages.map((page, index) => {
      const isActive = pathname === `/w/${workspaceId}/p/${page.id}`
      const busy = pending === `move:${page.id}`

      return (
        <li
          key={page.id}
          onDragOver={allowDrop}
          onDrop={(event) =>
            handleDrop(event, { sectionId: section.id, parentPageId: page.id })
          }
          className={dragging === page.id ? 'opacity-50' : undefined}
        >
          <div
            className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
              isActive ? 'bg-accent-soft/70' : 'hover:bg-ink/5'
            }`}
            style={{ paddingLeft: `${level * 0.6}rem` }}
          >
            {canEdit && (
              <button
                type="button"
                draggable
                aria-label={`Drag ${page.title}`}
                title="Drag onto a section or page"
                onDragStart={(event) => handleDragStart(event, page.id)}
                onDragEnd={() => setDragging(null)}
                className="cursor-grab rounded px-1 text-ink-soft/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:cursor-grabbing"
              >
                ⠿
              </button>
            )}

            <Link
              href={`/w/${workspaceId}/p/${page.id}`}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-sm text-ink"
            >
              <span aria-hidden="true" className="text-xs">
                {page.icon ?? '·'}
              </span>
              <span className="truncate">{page.title}</span>
            </Link>

            <button
              type="button"
              onClick={() => toggleFavorite(page, `favorite:${page.id}`)}
              aria-label={
                page.favorite ? `Remove ${page.title} from favorites` : `Favorite ${page.title}`
              }
              aria-pressed={page.favorite}
              disabled={pending === `favorite:${page.id}`}
              className={`rounded px-1 text-xs transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                page.favorite ? 'text-accent' : 'text-ink-soft/50'
              }`}
            >
              {page.favorite ? '★' : '☆'}
            </button>

            {canEdit && (
              <span className="flex items-center">
                <button
                  type="button"
                  onClick={() => moveRelative(page, pages, -1)}
                  disabled={index === 0 || busy}
                  aria-label={`Move ${page.title} up`}
                  className={smallButtonClassName}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveRelative(page, pages, 1)}
                  disabled={index === pages.length - 1 || busy}
                  aria-label={`Move ${page.title} down`}
                  className={smallButtonClassName}
                >
                  ↓
                </button>
              </span>
            )}
          </div>

          {page.children.length > 0 && (
            <ul className="mt-0.5 space-y-0.5">
              {renderPages(page.children, section, level + 1)}
            </ul>
          )}
        </li>
      )
    })
  }

  return (
    <aside className="w-full lg:sticky lg:top-20 lg:w-80 lg:shrink-0" aria-label="Library">
      <div className="rounded-2xl border border-line bg-paper-raised/90 p-4 shadow-[0_18px_45px_-38px_rgba(27,36,48,0.55)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Library</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowNotebookForm((open) => !open)}
              className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {showNotebookForm ? 'Close' : '+ Notebook'}
            </button>
          )}
        </div>

        {(error || notice) && (
          <div className="mt-3 space-y-2">
            <FormError message={error} />
            {notice && (
              <div
                role="status"
                className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success"
              >
                {notice}
              </div>
            )}
          </div>
        )}

        {showNotebookForm && canEdit && (
          <form onSubmit={createNotebook} className="mt-3 space-y-2 rounded-xl border border-line bg-paper p-3">
            <label htmlFor="new-notebook-name" className="sr-only">
              Notebook name
            </label>
            <input
              id="new-notebook-name"
              name="name"
              required
              maxLength={80}
              placeholder="Notebook name"
              className={smallInputClassName}
            />
            <label htmlFor="new-notebook-icon" className="sr-only">
              Notebook icon
            </label>
            <select
              id="new-notebook-icon"
              name="icon"
              defaultValue=""
              className={smallInputClassName}
            >
              <option value="">No icon</option>
              {NOTEBOOK_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending === 'create-notebook'}
              className="w-full rounded-lg bg-ink px-3 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending === 'create-notebook' ? 'Creating…' : 'Create notebook'}
            </button>
          </form>
        )}

        <nav className="mt-4" aria-label="Notebooks and pages">
          {hierarchy.favorites.length > 0 && (
            <section aria-labelledby="favorites-heading" className="mb-4">
              <h2
                id="favorites-heading"
                className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft"
              >
                Favorites
              </h2>
              <ul className="mt-1.5 space-y-0.5">
                {hierarchy.favorites.map((page) => (
                  <FavoriteRow
                    key={page.id}
                    workspaceId={workspaceId}
                    page={page}
                    active={pathname === `/w/${workspaceId}/p/${page.id}`}
                    onToggle={() => toggleFavorite({ id: page.id, favorite: true }, `favorite:${page.id}`)}
                    pending={pending === `favorite:${page.id}`}
                  />
                ))}
              </ul>
            </section>
          )}

          {hierarchy.notebooks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center">
              <p className="text-sm font-medium">No notebooks yet</p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">
                {canEdit
                  ? 'Create one to give sections and pages a home.'
                  : 'The owner has not created a notebook yet.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
              {hierarchy.notebooks.map((notebook) => (
                <NotebookSection
                  key={notebook.id}
                  notebook={notebook}
                  canEdit={canEdit}
                  pending={pending}
                  confirmKey={confirmKey}
                  sectionFormFor={sectionFormFor}
                  pageFormFor={pageFormFor}
                  onToggleSectionForm={(id) =>
                    setSectionFormFor((current) => (current === id ? null : id))
                  }
                  onTogglePageForm={(id) =>
                    setPageFormFor((current) => (current === id ? null : id))
                  }
                  onCreateSection={createSection}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onUpdateNotebook={updateNotebook}
                  onDeleteNotebook={deleteNotebook}
                  onCreatePage={createPage}
                  onDropPage={handleDrop}
                  onAllowDrop={allowDrop}
                  renderPages={renderPages}
                />
              ))}
            </div>
          )}
        </nav>

        <div className="mt-4 border-t border-line pt-3">
          <Link
            href={`/w/${workspaceId}/trash`}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span>Trash</span>
            <span aria-hidden="true">{hierarchy.trash.length}</span>
          </Link>
          {!canEdit && (
            <p className="mt-3 px-1 text-[11px] leading-4 text-ink-soft">
              You have view-only access. Ask an owner for editor access to change the library.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

function FavoriteRow({
  workspaceId,
  page,
  active,
  onToggle,
  pending,
}: {
  workspaceId: string
  page: PageLink
  active: boolean
  onToggle: () => void
  pending: boolean
}) {
  return (
    <li className={`flex items-center gap-1 rounded-lg pr-1 ${active ? 'bg-accent-soft/70' : 'hover:bg-ink/5'}`}>
      <Link
        href={`/w/${workspaceId}/p/${page.id}`}
        aria-current={active ? 'page' : undefined}
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-sm text-ink"
      >
        <span aria-hidden="true" className="text-xs">
          {page.icon ?? '★'}
        </span>
        <span className="truncate">{page.title}</span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-label={`Remove ${page.title} from favorites`}
        className="rounded px-1 text-xs text-accent transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        ★
      </button>
    </li>
  )
}

type NotebookSectionProps = {
  notebook: NotebookView
  canEdit: boolean
  pending: string | null
  confirmKey: string | null
  sectionFormFor: string | null
  pageFormFor: string | null
  onToggleSectionForm: (notebookId: string) => void
  onTogglePageForm: (sectionId: string) => void
  onCreateSection: (event: FormEvent<HTMLFormElement>, notebookId: string) => Promise<void>
  onUpdateSection: (event: FormEvent<HTMLFormElement>, sectionId: string) => Promise<void>
  onDeleteSection: (sectionId: string) => Promise<void>
  onUpdateNotebook: (event: FormEvent<HTMLFormElement>, notebookId: string) => Promise<void>
  onDeleteNotebook: (notebookId: string) => Promise<void>
  onCreatePage: (event: FormEvent<HTMLFormElement>, section: SectionView) => Promise<void>
  onDropPage: (
    event: DragEvent<HTMLElement>,
    target: { sectionId: string; parentPageId: string | null },
  ) => Promise<void>
  onAllowDrop: (event: DragEvent<HTMLElement>) => void
  renderPages: (pages: PageNode[], section: SectionView, level: number) => ReactNode
}

function NotebookSection({
  notebook,
  canEdit,
  pending,
  confirmKey,
  sectionFormFor,
  pageFormFor,
  onToggleSectionForm,
  onTogglePageForm,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onUpdateNotebook,
  onDeleteNotebook,
  onCreatePage,
  onDropPage,
  onAllowDrop,
  renderPages,
}: NotebookSectionProps) {
  const [editing, setEditing] = useState(false)

  return (
    <section aria-labelledby={`notebook-${notebook.id}`}>
      <div className="flex items-center gap-2 px-1">
        <span aria-hidden="true" className="text-sm">
          {notebook.icon ?? '📚'}
        </span>
        <h2
          id={`notebook-${notebook.id}`}
          className="min-w-0 flex-1 truncate text-sm font-semibold"
        >
          {notebook.name}
        </h2>
        <span className="text-[10px] text-ink-soft" aria-label={`${notebook.pageCount} pages`}>
          {notebook.pageCount}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            aria-expanded={editing}
            className="rounded px-1 text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Edit
          </button>
        )}
      </div>

      {editing && canEdit && (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-paper p-3">
          <form
            onSubmit={(event) => onUpdateNotebook(event, notebook.id)}
            className="space-y-2"
          >
            <label htmlFor={`notebook-name-${notebook.id}`} className="sr-only">
              Notebook name
            </label>
            <input
              id={`notebook-name-${notebook.id}`}
              name="name"
              required
              maxLength={80}
              defaultValue={notebook.name}
              className={smallInputClassName}
            />
            <label htmlFor={`notebook-icon-${notebook.id}`} className="sr-only">
              Notebook icon
            </label>
            <select
              id={`notebook-icon-${notebook.id}`}
              name="icon"
              defaultValue={notebook.icon ?? ''}
              className={smallInputClassName}
            >
              <option value="">No icon</option>
              {NOTEBOOK_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending === `notebook:${notebook.id}`}
              className="w-full rounded-lg border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
            >
              {pending === `notebook:${notebook.id}` ? 'Saving…' : 'Save notebook'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => onDeleteNotebook(notebook.id)}
            disabled={pending === `notebook:${notebook.id}`}
            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
          >
            {confirmKey === `delete-notebook:${notebook.id}`
              ? 'Confirm delete notebook'
              : 'Delete notebook'}
          </button>
        </div>
      )}

      <div className="mt-1.5 space-y-1.5">
        {notebook.sections.map((section) => (
          <div key={section.id}>
            <div
              onDragOver={onAllowDrop}
              onDrop={(event) =>
                onDropPage(event, { sectionId: section.id, parentPageId: null })
              }
              className="group flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-ink/5"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: section.color }}
              />
              <h3 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                {section.name}
              </h3>
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => onTogglePageForm(section.id)}
                    aria-expanded={pageFormFor === section.id}
                    aria-label={`Add a page to ${section.name}`}
                    className="rounded px-1 text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    + Page
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSectionForm(section.id)}
                    aria-expanded={sectionFormFor === section.id}
                    aria-label={`Edit ${section.name}`}
                    className="rounded px-1 text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    ⋯
                  </button>
                </>
              )}
            </div>

            {sectionFormFor === section.id && canEdit && (
              <div className="mb-2 ml-3 space-y-2 rounded-xl border border-line bg-paper p-3">
                <form
                  onSubmit={(event) => onUpdateSection(event, section.id)}
                  className="space-y-2"
                >
                  <label htmlFor={`section-name-${section.id}`} className="sr-only">
                    Section name
                  </label>
                  <input
                    id={`section-name-${section.id}`}
                    name="name"
                    required
                    maxLength={60}
                    defaultValue={section.name}
                    className={smallInputClassName}
                  />
                  <label htmlFor={`section-color-${section.id}`} className="sr-only">
                    Section color
                  </label>
                  <select
                    id={`section-color-${section.id}`}
                    name="color"
                    defaultValue={section.color}
                    className={smallInputClassName}
                  >
                    {SECTION_COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={pending === `section:${section.id}`}
                    className="w-full rounded-lg border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
                  >
                    {pending === `section:${section.id}` ? 'Saving…' : 'Save section'}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => onDeleteSection(section.id)}
                  disabled={pending === `section:${section.id}`}
                  className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
                >
                  {confirmKey === `delete-section:${section.id}`
                    ? 'Confirm delete section'
                    : 'Delete section'}
                </button>
              </div>
            )}

            {pageFormFor === section.id && canEdit && (
              <form
                onSubmit={(event) => onCreatePage(event, section)}
                className="mb-2 ml-3 space-y-2 rounded-xl border border-line bg-paper p-3"
              >
                <label htmlFor={`new-page-${section.id}`} className="sr-only">
                  Page title
                </label>
                <input
                  id={`new-page-${section.id}`}
                  name="title"
                  required
                  maxLength={200}
                  defaultValue="Untitled"
                  className={smallInputClassName}
                />
                <button
                  type="submit"
                  disabled={pending === `create-page:${section.id}`}
                  className="w-full rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-60"
                >
                  {pending === `create-page:${section.id}` ? 'Creating…' : 'Create page'}
                </button>
              </form>
            )}

            {section.pages.length > 0 ? (
              <ul className="space-y-0.5">
                {renderPages(section.pages, section, 0)}
              </ul>
            ) : (
              <p className="px-2 py-1 text-[11px] text-ink-soft/80">
                {canEdit ? 'Drop a page here or add one.' : 'No pages yet.'}
              </p>
            )}
          </div>
        ))}

        {canEdit && (
          <div className="pl-1">
            <button
              type="button"
              onClick={() => onToggleSectionForm(notebook.id)}
              aria-expanded={sectionFormFor === notebook.id}
              className="rounded px-1 py-0.5 text-[11px] font-medium text-ink-soft transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              + Section
            </button>
          </div>
        )}

        {sectionFormFor === notebook.id && canEdit && (
          <form
            onSubmit={(event) => onCreateSection(event, notebook.id)}
            className="ml-1 space-y-2 rounded-xl border border-line bg-paper p-3"
          >
            <label htmlFor={`new-section-${notebook.id}`} className="sr-only">
              Section name
            </label>
            <input
              id={`new-section-${notebook.id}`}
              name="name"
              required
              maxLength={60}
              placeholder="Section name"
              className={smallInputClassName}
            />
            <label htmlFor={`new-section-color-${notebook.id}`} className="sr-only">
              Section color
            </label>
            <select
              id={`new-section-color-${notebook.id}`}
              name="color"
              defaultValue={SECTION_COLORS[0].value}
              className={smallInputClassName}
            >
              {SECTION_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending === `create-section:${notebook.id}`}
              className="w-full rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-60"
            >
              {pending === `create-section:${notebook.id}` ? 'Creating…' : 'Create section'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
