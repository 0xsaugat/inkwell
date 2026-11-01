import { z } from 'zod'
import type { WorkspaceRole } from './workspaces'

export const notebookNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the notebook a name')
  .max(80, 'Use at most 80 characters')

export const sectionNameSchema = z
  .string()
  .trim()
  .min(1, 'Give the section a name')
  .max(60, 'Use at most 60 characters')

export const pageTitleSchema = z
  .string()
  .trim()
  .min(1, 'Give the page a title')
  .max(200, 'Use at most 200 characters')

export const iconSchema = z.string().trim().min(1).max(16, 'Use a short icon')

export const sectionColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color')

export const pageCoverSchema = z.enum(['linen', 'dusk', 'moss', 'clay'])
export const pageTypeSchema = z.enum(['flow', 'canvas', 'database'])

export const notebookIdSchema = z.uuid()
export const sectionIdSchema = z.uuid()
export const pageIdSchema = z.uuid()

export const createNotebookInputSchema = z.object({
  name: notebookNameSchema,
  icon: iconSchema.nullable().default(null),
})

export const updateNotebookInputSchema = z.object({
  name: notebookNameSchema,
  icon: iconSchema.nullable(),
})

export const createSectionInputSchema = z.object({
  notebookId: notebookIdSchema,
  name: sectionNameSchema,
  color: sectionColorSchema,
})

export const updateSectionInputSchema = z.object({
  name: sectionNameSchema,
  color: sectionColorSchema,
})

export const createPageInputSchema = z.object({
  sectionId: sectionIdSchema,
  title: pageTitleSchema.default('Untitled'),
  parentPageId: pageIdSchema.nullable().default(null),
  type: pageTypeSchema.default('flow'),
})

export const updatePageInputSchema = z.object({
  title: pageTitleSchema,
  icon: iconSchema.nullable(),
  cover: pageCoverSchema.nullable(),
})

export const movePageInputSchema = z.object({
  sectionId: sectionIdSchema,
  parentPageId: pageIdSchema.nullable().default(null),
  beforePageId: pageIdSchema.nullable().default(null),
})

export const setFavoriteInputSchema = z.object({
  favorite: z.boolean(),
})

export type CreateNotebookInput = z.input<typeof createNotebookInputSchema>
export type UpdateNotebookInput = z.infer<typeof updateNotebookInputSchema>
export type CreateSectionInput = z.infer<typeof createSectionInputSchema>
export type UpdateSectionInput = z.infer<typeof updateSectionInputSchema>
export type CreatePageInput = z.input<typeof createPageInputSchema>
export type UpdatePageInput = z.infer<typeof updatePageInputSchema>
export type MovePageInput = z.input<typeof movePageInputSchema>
export type SetFavoriteInput = z.infer<typeof setFavoriteInputSchema>
export type PageCover = z.infer<typeof pageCoverSchema>
export type PageType = z.infer<typeof pageTypeSchema>

export const POSITION_WIDTH = 8
const MAX_POSITION_INDEX = 10 ** POSITION_WIDTH - 1

export function positionForIndex(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > MAX_POSITION_INDEX) {
    throw new RangeError('Position index is out of range')
  }

  return String(index).padStart(POSITION_WIDTH, '0')
}

export function positionAfter(lastPosition: string | null | undefined): string {
  const parsed = lastPosition ? Number.parseInt(lastPosition, 10) : Number.NaN
  const next = Number.isFinite(parsed) ? parsed + 1 : 0
  return positionForIndex(next)
}

export type PageNode = {
  id: string
  title: string
  icon: string | null
  cover: PageCover | null
  type: PageType
  sectionId: string | null
  parentPageId: string | null
  position: string
  favorite: boolean
  updatedAt: string
  children: PageNode[]
}

export type PageLink = {
  id: string
  title: string
  icon: string | null
  sectionId: string | null
  parentPageId: string | null
}

export type SectionView = {
  id: string
  notebookId: string
  name: string
  color: string
  position: string
  pages: PageNode[]
}

export type NotebookView = {
  id: string
  name: string
  icon: string | null
  position: string
  pageCount: number
  sections: SectionView[]
}

export type TrashedPageView = {
  id: string
  title: string
  icon: string | null
  sectionId: string | null
  notebookName: string | null
  sectionName: string | null
  trashedAt: string
  descendantCount: number
}

export type WorkspaceHierarchy = {
  workspace: {
    id: string
    name: string
  }
  role: WorkspaceRole
  notebooks: NotebookView[]
  favorites: PageLink[]
  trash: TrashedPageView[]
}

export type PageBreadcrumb = {
  id: string
  title: string
}

export type PageDetail = {
  page: PageNode
  role: WorkspaceRole
  favorite: boolean
  notebook: { id: string; name: string; icon: string | null } | null
  section: { id: string; name: string; color: string } | null
  ancestors: PageBreadcrumb[]
}
