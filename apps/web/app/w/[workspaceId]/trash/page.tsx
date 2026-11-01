import { TrashList } from '@/components/trash-list'
import { getWorkspaceView } from '@/lib/workspace-data'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Trash' }

export default async function TrashPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { hierarchy } = await getWorkspaceView(workspaceId)

  return (
    <main className="mx-auto w-full max-w-4xl">
      <Link
        href={`/w/${workspaceId}`}
        className="inline-flex items-center gap-2 rounded-sm text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">←</span>
        Back to workspace
      </Link>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Trash</p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-0.04em]">Removed pages.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">
          Trashed pages keep their nested pages together. Restoring a page brings its subtree back
          to the section it came from; deleting forever also removes everything underneath it.
        </p>
      </div>

      <div className="mt-10">
        <TrashList
          workspaceId={workspaceId}
          trash={hierarchy.trash}
          canEdit={hierarchy.role !== 'viewer'}
        />
      </div>
    </main>
  )
}
