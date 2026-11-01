import { AppError } from '@inkwell/core'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { requireActor } from './auth'
import { getServices } from './services'

export const getWorkspaceView = cache(async (workspaceId: string) => {
  const actor = await requireActor(`/w/${workspaceId}`)

  try {
    const hierarchy = await getServices().hierarchy.getHierarchy(actor, workspaceId)
    return { actor, hierarchy }
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound()
    }

    throw error
  }
})
