'use client'

import type { PageCover, PageNode, WorkspaceRole } from '@inkwell/shared'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { PAGE_COVERS, PAGE_ICONS } from '@/lib/hierarchy-ui'
import { FormError, inputClassName } from './form-field'

type PageControlsProps = {
  workspaceId: string
  page: PageNode
  role: WorkspaceRole
  favorite: boolean
  sectionId: string | null
  sections: { id: string; name: string; notebookName: string }[]
}

const selectClassName =
  'w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10'

export function PageControls({
  workspaceId,
  page,
  role,
  favorite,
  sectionId,
  sections,
}: PageControlsProps) {
  const router = useRouter()
  const canEdit = role !== 'viewer'
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmingTrash, setConfirmingTrash] = useState(false)

  async function run(key: string, action: () => Promise<void>, successMessage: string) {
    setPending(key)
    setError(null)
    setNotice(null)

    try {
      await action()
      setNotice(successMessage)
      router.refresh()
    } catch (actionError) {
      setError(errorMessage(actionError))
    } finally {
      setPending(null)
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const coverValue = String(data.get('cover') ?? 'none')

    await run(
      'details',
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: String(data.get('title') ?? ''),
            icon: String(data.get('icon') ?? '') || null,
            cover: coverValue === 'none' ? null : (coverValue as PageCover),
          }),
        })
      },
      'Page details saved',
    )
  }

  async function toggleFavorite() {
    await run(
      'favorite',
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}/favorite`, {
          method: 'PUT',
          body: JSON.stringify({ favorite: !favorite }),
        })
      },
      favorite ? 'Removed from favorites' : 'Added to favorites',
    )
  }

  async function moveToSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextSectionId = String(data.get('sectionId') ?? '')

    await run(
      'move',
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}/move`, {
          method: 'POST',
          body: JSON.stringify({
            sectionId: nextSectionId,
            parentPageId: null,
            beforePageId: null,
          }),
        })
      },
      'Page moved to the end of that section',
    )
  }

  async function addChildPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sectionId) {
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)

    await run(
      'child',
      async () => {
        const result = await apiFetch<{ page: PageNode }>(
          `/api/workspaces/${workspaceId}/pages`,
          {
            method: 'POST',
            body: JSON.stringify({
              sectionId,
              parentPageId: page.id,
              title: String(data.get('title') ?? 'Untitled'),
            }),
          },
        )
        form.reset()
        router.push(`/w/${workspaceId}/p/${result.page.id}`)
      },
      'Child page created',
    )
  }

  async function trashPage() {
    if (!confirmingTrash) {
      setConfirmingTrash(true)
      return
    }

    setPending('trash')
    setError(null)

    try {
      await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}`, {
        method: 'DELETE',
      })
      router.push(`/w/${workspaceId}`)
    } catch (actionError) {
      setError(errorMessage(actionError))
      setPending(null)
      setConfirmingTrash(false)
    }
  }

  return (
    <div className="space-y-5">
      {(error || notice) && (
        <div className="space-y-3">
          <FormError message={error} />
          {notice && (
            <div
              role="status"
              className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
            >
              {notice}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleFavorite}
          disabled={pending === 'favorite'}
          aria-pressed={favorite}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
            favorite
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line bg-paper-raised text-ink hover:border-accent hover:text-accent'
          }`}
        >
          <span aria-hidden="true">{favorite ? '★' : '☆'}</span>
          {favorite ? 'Favorited' : 'Add to favorites'}
        </button>
        {!canEdit && (
          <span className="text-xs text-ink-soft">
            View only — editors can change this page.
          </span>
        )}
      </div>

      {canEdit && (
        <section
          aria-labelledby="page-details-heading"
          className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-6"
        >
          <h2 id="page-details-heading" className="font-serif text-2xl tracking-[-0.02em]">
            Page details
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Rename the page, give it an icon, or set a cover. Content editing arrives in M3.
          </p>

          <form onSubmit={saveDetails} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="page-title" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Title
              </label>
              <input
                id="page-title"
                name="title"
                required
                maxLength={200}
                defaultValue={page.title}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="page-icon" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Icon
              </label>
              <select
                id="page-icon"
                name="icon"
                defaultValue={page.icon ?? ''}
                className={selectClassName}
              >
                <option value="">No icon</option>
                {PAGE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="page-cover" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Cover
              </label>
              <select
                id="page-cover"
                name="cover"
                defaultValue={page.cover ?? 'none'}
                className={selectClassName}
              >
                <option value="none">None</option>
                {PAGE_COVERS.map((cover) => (
                  <option key={cover.value} value={cover.value}>
                    {cover.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending === 'details'}
                className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
              >
                {pending === 'details' ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </form>
        </section>
      )}

      {canEdit && (
        <div className="grid gap-5 sm:grid-cols-2">
          <section
            aria-labelledby="move-page-heading"
            className="rounded-2xl border border-line bg-paper-raised p-5"
          >
            <h2 id="move-page-heading" className="font-serif text-xl tracking-[-0.02em]">
              Move page
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              Drag pages in the library, or move this page to the end of another section.
            </p>
            <form onSubmit={moveToSection} className="mt-3 space-y-2">
              <label htmlFor="move-section" className="sr-only">
                Destination section
              </label>
              <select
                id="move-section"
                name="sectionId"
                defaultValue={sectionId ?? ''}
                required
                className={selectClassName}
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.notebookName} · {section.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending === 'move'}
                className="w-full rounded-xl border border-ink px-3 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
              >
                {pending === 'move' ? 'Moving…' : 'Move to section'}
              </button>
            </form>
          </section>

          <section
            aria-labelledby="child-page-heading"
            className="rounded-2xl border border-line bg-paper-raised p-5"
          >
            <h2 id="child-page-heading" className="font-serif text-xl tracking-[-0.02em]">
              Add a child page
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              Nested pages stay under this page and move with it.
            </p>
            {sectionId ? (
              <form onSubmit={addChildPage} className="mt-3 space-y-2">
                <label htmlFor="child-title" className="sr-only">
                  Child page title
                </label>
                <input
                  id="child-title"
                  name="title"
                  required
                  maxLength={200}
                  defaultValue="Untitled"
                  className={inputClassName}
                />
                <button
                  type="submit"
                  disabled={pending === 'child'}
                  className="w-full rounded-xl border border-ink px-3 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
                >
                  {pending === 'child' ? 'Creating…' : 'Create child page'}
                </button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-ink-soft">Move this page into a section first.</p>
            )}
          </section>
        </div>
      )}

      {canEdit && (
        <section
          aria-labelledby="trash-page-heading"
          className="rounded-2xl border border-danger/25 bg-danger/[0.03] p-5"
        >
          <h2 id="trash-page-heading" className="font-serif text-xl tracking-[-0.02em]">
            Move to trash
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            This page and its nested pages go to the workspace trash. You can restore them from the
            library.
          </p>
          <button
            type="button"
            onClick={trashPage}
            disabled={pending === 'trash'}
            className="mt-4 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
          >
            {pending === 'trash'
              ? 'Moving…'
              : confirmingTrash
                ? 'Confirm move to trash'
                : 'Move this page to trash'}
          </button>
          {confirmingTrash && (
            <button
              type="button"
              onClick={() => setConfirmingTrash(false)}
              className="ml-3 rounded-lg px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Keep the page
            </button>
          )}
        </section>
      )}
    </div>
  )
}
