import { AppHeader, WorkspaceBreadcrumb } from '@/components/app-header'
import { WorkspaceSidebar } from '@/components/workspace-sidebar'
import { getWorkspaceView } from '@/lib/workspace-data'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { actor, hierarchy } = await getWorkspaceView(workspaceId)

  return (
    <div className="relative min-h-dvh">
      <div
        className="ink-wash pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
        aria-hidden="true"
      />
      <div className="relative">
        <AppHeader
          actor={actor}
          breadcrumb={
            <WorkspaceBreadcrumb
              name={hierarchy.workspace.name}
              href={`/w/${workspaceId}`}
            />
          }
        />

        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-4 pb-24 pt-6 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:pt-8">
          <WorkspaceSidebar workspaceId={workspaceId} hierarchy={hierarchy} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
