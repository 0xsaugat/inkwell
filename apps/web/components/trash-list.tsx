'use client'

import type { TrashedPageView } from '@inkwell/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch, errorMessage } from '@/lib/client-api'
import { FormError } from './form-field'

type TrashListProps = {
  workspaceId: string
  trash: TrashedPageView[]
  canEdit: boolean
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function TrashList({ workspaceId, trash, canEdit }: TrashListProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

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
      setConfirmKey(null)
    }
  }

  async function restore(page: TrashedPageView) {
    await run(
      `restore:${page.id}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}/restore`, {
          method: 'POST',
        })
      },
      `“${page.title}” restored`,
    )
  }

  async function purge(page: TrashedPageView) {
    if (confirmKey !== `purge:${page.id}`) {
      setConfirmKey(`purge:${page.id}`)
      return
    }

    await run(
      `purge:${page.id}`,
      async () => {
        await apiFetch(`/api/workspaces/${workspaceId}/pages/${page.id}/purge`, {
          method: 'DELETE',
        })
      },
      `“${page.title}” deleted forever`,
    )
  }

  return (
    <div>
      {(error || notice) && (
        <div className="mb-5 space-y-3">
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

      {trash.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper-raised/60 px-8 py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft font-serif text-2xl text-accent">
            ⌫
          </span>
          <h2 className="mt-5 font-serif text-2xl tracking-[-0.02em]">The trash is empty.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            Trashed pages appear here with their nested pages so you can restore them.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {trash.map((page) => {
            const busy = pending === `restore:${page.id}` || pending === `purge:${page.id}`

            return (
              <li
                key={page.id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span aria-hidden="true">{page.icon ?? '📄'}</span>
                    <span className="truncate">{page.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {[page.notebookName, page.sectionName].filter(Boolean).join(' · ') ||
                      'No section'}{' '}
                    · trashed {dateFormatter.format(new Date(page.trashedAt))}
                    {page.descendantCount > 0 &&
                      ` · ${page.descendantCount} nested ${page.descendantCount === 1 ? 'page' : 'pages'}`}
                  </p>
                </div>

                {canEdit ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => restore(page)}
                      disabled={busy}
                      className="rounded-lg border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    >
                      {pending === `restore:${page.id}` ? 'Restoring…' : 'Restore'}
                    </button>
                    <button
                      type="button"
                      onClick={() => purge(page)}
                      disabled={busy}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                    >
                      {pending === `purge:${page.id}`
                        ? 'Deleting…'
                        : confirmKey === `purge:${page.id}`
                          ? 'Confirm delete forever'
                          : 'Delete forever'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-ink-soft">View only</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
