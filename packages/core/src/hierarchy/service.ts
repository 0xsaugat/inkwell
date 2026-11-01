import { schema } from '@inkwell/db'
import type {
  CreateNotebookInput,
  CreatePageInput,
  CreateSectionInput,
  MovePageInput,
  NotebookView,
  PageDetail,
  PageLink,
  PageNode,
  SectionView,
  TrashedPageView,
  UpdateNotebookInput,
  UpdatePageInput,
  UpdateSectionInput,
  WorkspaceHierarchy,
} from '@inkwell/shared'
import { positionAfter, positionForIndex } from '@inkwell/shared'
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm'
import {
  requirePageRole,
  requirePageWrite,
  requireWorkspaceRole,
  requireWorkspaceWrite,
} from '../authz'
import type { SessionUser } from '../auth/session'
import { badRequest, conflict, notFound } from '../errors'
import type { ServiceDeps } from '../service-context'
import { serviceClock } from '../service-context'

type Actor = Pick<SessionUser, 'id' | 'name' | 'email'>

type PageRow = {
  id: string
  sectionId: string | null
  parentPageId: string | null
  type: 'flow' | 'canvas' | 'database'
  title: string
  icon: string | null
  cover: string | null
  position: string
  updatedAt: Date
}

type TrashedPageRow = PageRow & {
  trashedAt: Date | null
  notebookName: string | null
  sectionName: string | null
}

const pageColumns = {
  id: schema.pages.id,
  sectionId: schema.pages.sectionId,
  parentPageId: schema.pages.parentPageId,
  type: schema.pages.type,
  title: schema.pages.title,
  icon: schema.pages.icon,
  cover: schema.pages.cover,
  position: schema.pages.position,
  updatedAt: schema.pages.updatedAt,
}

function toPageNode(row: PageRow, favorite: boolean, children: PageNode[]): PageNode {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    cover: (row.cover as PageNode['cover']) ?? null,
    type: row.type,
    sectionId: row.sectionId,
    parentPageId: row.parentPageId,
    position: row.position,
    favorite,
    updatedAt: row.updatedAt.toISOString(),
    children,
  }
}

function buildPageTree(rows: PageRow[], favoriteIds: Set<string>): PageNode[] {
  const byParent = new Map<string | null, PageRow[]>()

  for (const row of rows) {
    const siblings = byParent.get(row.parentPageId) ?? []
    siblings.push(row)
    byParent.set(row.parentPageId, siblings)
  }

  const build = (parentId: string | null): PageNode[] =>
    (byParent.get(parentId) ?? []).map((row) =>
      toPageNode(row, favoriteIds.has(row.id), build(row.id)),
    )

  return build(null)
}

function findPageNode(nodes: PageNode[], pageId: string): PageNode | null {
  for (const node of nodes) {
    if (node.id === pageId) {
      return node
    }

    const found = findPageNode(node.children, pageId)

    if (found) {
      return found
    }
  }

  return null
}

export function createHierarchyService(deps: ServiceDeps) {
  const { db } = deps
  const now = serviceClock(deps)

  async function touchWorkspace(workspaceId: string, currentTime: Date): Promise<void> {
    await db
      .update(schema.workspaces)
      .set({ updatedAt: currentTime })
      .where(eq(schema.workspaces.id, workspaceId))
  }

  async function findNotebook(workspaceId: string, notebookId: string) {
    const rows = await db
      .select({
        id: schema.notebooks.id,
        name: schema.notebooks.name,
        icon: schema.notebooks.icon,
        position: schema.notebooks.position,
      })
      .from(schema.notebooks)
      .where(
        and(eq(schema.notebooks.id, notebookId), eq(schema.notebooks.workspaceId, workspaceId)),
      )
      .limit(1)

    return rows[0] ?? null
  }

  async function findSection(workspaceId: string, sectionId: string) {
    const rows = await db
      .select({
        id: schema.sections.id,
        notebookId: schema.sections.notebookId,
        name: schema.sections.name,
        color: schema.sections.color,
        position: schema.sections.position,
        notebookName: schema.notebooks.name,
        notebookIcon: schema.notebooks.icon,
      })
      .from(schema.sections)
      .innerJoin(schema.notebooks, eq(schema.notebooks.id, schema.sections.notebookId))
      .where(
        and(eq(schema.sections.id, sectionId), eq(schema.notebooks.workspaceId, workspaceId)),
      )
      .limit(1)

    return rows[0] ?? null
  }

  async function descendantIds(pageId: string, workspaceId: string): Promise<Set<string>> {
    const descendants = new Set<string>()
    let frontier = [pageId]

    while (frontier.length > 0) {
      const rows = await db
        .select({ id: schema.pages.id })
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.workspaceId, workspaceId),
            inArray(schema.pages.parentPageId, frontier),
          ),
        )

      frontier = []

      for (const row of rows) {
        if (!descendants.has(row.id)) {
          descendants.add(row.id)
          frontier.push(row.id)
        }
      }
    }

    return descendants
  }

  async function siblingIds(
    workspaceId: string,
    sectionId: string | null,
    parentPageId: string | null,
    excludePageId?: string,
  ): Promise<string[]> {
    const conditions = [
      eq(schema.pages.workspaceId, workspaceId),
      isNull(schema.pages.trashedAt),
      sectionId ? eq(schema.pages.sectionId, sectionId) : isNull(schema.pages.sectionId),
      parentPageId ? eq(schema.pages.parentPageId, parentPageId) : isNull(schema.pages.parentPageId),
    ]

    if (excludePageId) {
      conditions.push(ne(schema.pages.id, excludePageId))
    }

    const rows = await db
      .select({ id: schema.pages.id })
      .from(schema.pages)
      .where(and(...conditions))
      .orderBy(asc(schema.pages.position), asc(schema.pages.createdAt))

    return rows.map((row) => row.id)
  }

  async function getHierarchy(actor: Actor, workspaceId: string): Promise<WorkspaceHierarchy> {
    const access = await requireWorkspaceRole(db, actor, workspaceId, 'viewer')

    const notebookRows = await db
      .select({
        id: schema.notebooks.id,
        name: schema.notebooks.name,
        icon: schema.notebooks.icon,
        position: schema.notebooks.position,
      })
      .from(schema.notebooks)
      .where(eq(schema.notebooks.workspaceId, workspaceId))
      .orderBy(asc(schema.notebooks.position), asc(schema.notebooks.createdAt))

    const sectionRows = await db
      .select({
        id: schema.sections.id,
        notebookId: schema.sections.notebookId,
        name: schema.sections.name,
        color: schema.sections.color,
        position: schema.sections.position,
      })
      .from(schema.sections)
      .innerJoin(schema.notebooks, eq(schema.notebooks.id, schema.sections.notebookId))
      .where(eq(schema.notebooks.workspaceId, workspaceId))
      .orderBy(asc(schema.sections.position), asc(schema.sections.createdAt))

    const pageRows = await db
      .select(pageColumns)
      .from(schema.pages)
      .where(and(eq(schema.pages.workspaceId, workspaceId), isNull(schema.pages.trashedAt)))
      .orderBy(asc(schema.pages.position), asc(schema.pages.createdAt))

    const favoriteRows = await db
      .select({ pageId: schema.favorites.pageId })
      .from(schema.favorites)
      .innerJoin(schema.pages, eq(schema.pages.id, schema.favorites.pageId))
      .where(
        and(
          eq(schema.favorites.userId, actor.id),
          eq(schema.pages.workspaceId, workspaceId),
          isNull(schema.pages.trashedAt),
        ),
      )
      .orderBy(desc(schema.favorites.createdAt))

    const trashedRows = await db
      .select({
        ...pageColumns,
        trashedAt: schema.pages.trashedAt,
        notebookName: schema.notebooks.name,
        sectionName: schema.sections.name,
      })
      .from(schema.pages)
      .leftJoin(schema.sections, eq(schema.sections.id, schema.pages.sectionId))
      .leftJoin(schema.notebooks, eq(schema.notebooks.id, schema.sections.notebookId))
      .where(and(eq(schema.pages.workspaceId, workspaceId), isNotNull(schema.pages.trashedAt)))
      .orderBy(desc(schema.pages.trashedAt))

    const favoriteIds = new Set(favoriteRows.map((row) => row.pageId))
    const pagesBySection = new Map<string | null, PageRow[]>()
    const pageById = new Map<string, PageRow>()
    const sectionById = new Map(sectionRows.map((row) => [row.id, row]))
    const countByNotebook = new Map<string, number>()

    for (const row of pageRows) {
      const sectionPages = pagesBySection.get(row.sectionId) ?? []
      sectionPages.push(row)
      pagesBySection.set(row.sectionId, sectionPages)
      pageById.set(row.id, row)

      const section = row.sectionId ? sectionById.get(row.sectionId) : undefined

      if (section) {
        countByNotebook.set(section.notebookId, (countByNotebook.get(section.notebookId) ?? 0) + 1)
      }
    }

    const sectionsByNotebook = new Map<string, SectionView[]>()

    for (const section of sectionRows) {
      const sections = sectionsByNotebook.get(section.notebookId) ?? []
      sections.push({
        id: section.id,
        notebookId: section.notebookId,
        name: section.name,
        color: section.color,
        position: section.position,
        pages: buildPageTree(pagesBySection.get(section.id) ?? [], favoriteIds),
      })
      sectionsByNotebook.set(section.notebookId, sections)
    }

    const notebooks: NotebookView[] = notebookRows.map((notebook) => ({
      id: notebook.id,
      name: notebook.name,
      icon: notebook.icon,
      position: notebook.position,
      pageCount: countByNotebook.get(notebook.id) ?? 0,
      sections: sectionsByNotebook.get(notebook.id) ?? [],
    }))

    const favorites: PageLink[] = favoriteRows.flatMap((favorite) => {
      const page = pageById.get(favorite.pageId)

      if (!page) {
        return []
      }

      return [
        {
          id: page.id,
          title: page.title,
          icon: page.icon,
          sectionId: page.sectionId,
          parentPageId: page.parentPageId,
        },
      ]
    })

    const trashedIds = new Set(
      trashedRows.flatMap((row) => (row.trashedAt ? [row.id] : [])),
    )
    const trashedChildren = new Map<string | null, string[]>()

    for (const row of trashedRows) {
      const children = trashedChildren.get(row.parentPageId) ?? []
      children.push(row.id)
      trashedChildren.set(row.parentPageId, children)
    }

    const countTrashedDescendants = (id: string, seen: Set<string>): number =>
      (trashedChildren.get(id) ?? []).reduce((total, childId) => {
        if (seen.has(childId)) {
          return total
        }

        seen.add(childId)
        return total + 1 + countTrashedDescendants(childId, seen)
      }, 0)

    const trash: TrashedPageView[] = trashedRows.flatMap((row) => {
      if (!row.trashedAt) {
        return []
      }

      if (row.parentPageId && trashedIds.has(row.parentPageId)) {
        return []
      }

      return [
        {
          id: row.id,
          title: row.title,
          icon: row.icon,
          sectionId: row.sectionId,
          notebookName: row.notebookName,
          sectionName: row.sectionName,
          trashedAt: row.trashedAt.toISOString(),
          descendantCount: countTrashedDescendants(row.id, new Set()),
        },
      ]
    })

    return {
      workspace: { id: access.workspace.id, name: access.workspace.name },
      role: access.role,
      notebooks,
      favorites,
      trash,
    }
  }

  async function getPageDetail(
    actor: Actor,
    workspaceId: string,
    pageId: string,
  ): Promise<PageDetail> {
    const access = await requirePageRole(db, actor, pageId, 'viewer', workspaceId)

    if (access.page.trashedAt) {
      throw notFound('Page not found')
    }

    const sectionPages = await db
      .select(pageColumns)
      .from(schema.pages)
      .where(
        and(
          eq(schema.pages.workspaceId, workspaceId),
          isNull(schema.pages.trashedAt),
          access.page.sectionId
            ? eq(schema.pages.sectionId, access.page.sectionId)
            : isNull(schema.pages.sectionId),
        ),
      )
      .orderBy(asc(schema.pages.position), asc(schema.pages.createdAt))

    const pageIds = sectionPages.map((row) => row.id)
    const favoriteRows =
      pageIds.length > 0
        ? await db
            .select({ pageId: schema.favorites.pageId })
            .from(schema.favorites)
            .where(
              and(
                eq(schema.favorites.userId, actor.id),
                inArray(schema.favorites.pageId, pageIds),
              ),
            )
        : []
    const favoriteIds = new Set(favoriteRows.map((row) => row.pageId))
    const tree = buildPageTree(sectionPages, favoriteIds)
    const page = findPageNode(tree, pageId)

    if (!page) {
      throw notFound('Page not found')
    }

    const rowById = new Map(sectionPages.map((row) => [row.id, row]))
    const ancestors: PageDetail['ancestors'] = []
    const seen = new Set<string>([pageId])
    let ancestorId = page.parentPageId

    while (ancestorId && !seen.has(ancestorId)) {
      seen.add(ancestorId)
      const ancestor = rowById.get(ancestorId)

      if (!ancestor) {
        break
      }

      ancestors.unshift({ id: ancestor.id, title: ancestor.title })
      ancestorId = ancestor.parentPageId
    }

    const section = access.page.sectionId
      ? await findSection(workspaceId, access.page.sectionId)
      : null

    return {
      page,
      role: access.role,
      favorite: favoriteIds.has(pageId),
      notebook: section
        ? { id: section.notebookId, name: section.notebookName, icon: section.notebookIcon }
        : null,
      section: section
        ? { id: section.id, name: section.name, color: section.color }
        : null,
      ancestors,
    }
  }

  async function createNotebook(
    actor: Actor,
    workspaceId: string,
    input: CreateNotebookInput,
  ): Promise<NotebookView> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const currentTime = now()
    const lastRows = await db
      .select({ position: schema.notebooks.position })
      .from(schema.notebooks)
      .where(eq(schema.notebooks.workspaceId, workspaceId))
      .orderBy(desc(schema.notebooks.position))
      .limit(1)

    const inserted = await db
      .insert(schema.notebooks)
      .values({
        workspaceId,
        name: input.name,
        icon: input.icon ?? null,
        position: positionAfter(lastRows[0]?.position),
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      .returning({
        id: schema.notebooks.id,
        name: schema.notebooks.name,
        icon: schema.notebooks.icon,
        position: schema.notebooks.position,
      })

    const notebook = inserted[0]

    if (!notebook) {
      throw new Error('Notebook insert returned no row')
    }

    await touchWorkspace(workspaceId, currentTime)

    return {
      id: notebook.id,
      name: notebook.name,
      icon: notebook.icon,
      position: notebook.position,
      pageCount: 0,
      sections: [],
    }
  }

  async function updateNotebook(
    actor: Actor,
    workspaceId: string,
    notebookId: string,
    input: UpdateNotebookInput,
  ): Promise<void> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const notebook = await findNotebook(workspaceId, notebookId)

    if (!notebook) {
      throw notFound('Notebook not found')
    }

    const currentTime = now()
    await db
      .update(schema.notebooks)
      .set({ name: input.name, icon: input.icon, updatedAt: currentTime })
      .where(eq(schema.notebooks.id, notebookId))
    await touchWorkspace(workspaceId, currentTime)
  }

  async function deleteNotebook(
    actor: Actor,
    workspaceId: string,
    notebookId: string,
  ): Promise<void> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const notebook = await findNotebook(workspaceId, notebookId)

    if (!notebook) {
      throw notFound('Notebook not found')
    }

    const sectionRows = await db
      .select({ id: schema.sections.id })
      .from(schema.sections)
      .where(eq(schema.sections.notebookId, notebookId))
      .limit(1)

    if (sectionRows.length > 0) {
      throw conflict('Delete the notebook’s sections first')
    }

    await db.delete(schema.notebooks).where(eq(schema.notebooks.id, notebookId))
    await touchWorkspace(workspaceId, now())
  }

  async function createSection(
    actor: Actor,
    workspaceId: string,
    input: CreateSectionInput,
  ): Promise<SectionView> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const notebook = await findNotebook(workspaceId, input.notebookId)

    if (!notebook) {
      throw notFound('Notebook not found')
    }

    const lastRows = await db
      .select({ position: schema.sections.position })
      .from(schema.sections)
      .where(eq(schema.sections.notebookId, input.notebookId))
      .orderBy(desc(schema.sections.position))
      .limit(1)

    const currentTime = now()
    const inserted = await db
      .insert(schema.sections)
      .values({
        notebookId: input.notebookId,
        name: input.name,
        color: input.color,
        position: positionAfter(lastRows[0]?.position),
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      .returning({
        id: schema.sections.id,
        notebookId: schema.sections.notebookId,
        name: schema.sections.name,
        color: schema.sections.color,
        position: schema.sections.position,
      })

    const section = inserted[0]

    if (!section) {
      throw new Error('Section insert returned no row')
    }

    await touchWorkspace(workspaceId, currentTime)

    return {
      id: section.id,
      notebookId: section.notebookId,
      name: section.name,
      color: section.color,
      position: section.position,
      pages: [],
    }
  }

  async function updateSection(
    actor: Actor,
    workspaceId: string,
    sectionId: string,
    input: UpdateSectionInput,
  ): Promise<void> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const section = await findSection(workspaceId, sectionId)

    if (!section) {
      throw notFound('Section not found')
    }

    const currentTime = now()
    await db
      .update(schema.sections)
      .set({ name: input.name, color: input.color, updatedAt: currentTime })
      .where(eq(schema.sections.id, sectionId))
    await touchWorkspace(workspaceId, currentTime)
  }

  async function deleteSection(
    actor: Actor,
    workspaceId: string,
    sectionId: string,
  ): Promise<void> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const section = await findSection(workspaceId, sectionId)

    if (!section) {
      throw notFound('Section not found')
    }

    const pageRows = await db
      .select({ id: schema.pages.id })
      .from(schema.pages)
      .where(eq(schema.pages.sectionId, sectionId))
      .limit(1)

    if (pageRows.length > 0) {
      throw conflict('Move or delete the section’s pages first')
    }

    await db.delete(schema.sections).where(eq(schema.sections.id, sectionId))
    await touchWorkspace(workspaceId, now())
  }

  async function createPage(
    actor: Actor,
    workspaceId: string,
    input: CreatePageInput,
  ): Promise<PageNode> {
    await requireWorkspaceWrite(db, actor, workspaceId)
    const section = await findSection(workspaceId, input.sectionId)
    const parentPageId = input.parentPageId ?? null
    const title = input.title ?? 'Untitled'
    const type = input.type ?? 'flow'

    if (!section) {
      throw notFound('Section not found')
    }

    if (parentPageId) {
      const parentRows = await db
        .select({
          sectionId: schema.pages.sectionId,
          trashedAt: schema.pages.trashedAt,
        })
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.id, parentPageId),
            eq(schema.pages.workspaceId, workspaceId),
          ),
        )
        .limit(1)

      const parent = parentRows[0]

      if (!parent || parent.trashedAt) {
        throw notFound('Parent page not found')
      }

      if (parent.sectionId !== input.sectionId) {
        throw badRequest('The parent page must be in the same section')
      }
    }

    const lastRows = await db
      .select({ position: schema.pages.position })
      .from(schema.pages)
      .where(
        and(
          eq(schema.pages.workspaceId, workspaceId),
          eq(schema.pages.sectionId, input.sectionId),
          isNull(schema.pages.trashedAt),
          parentPageId
            ? eq(schema.pages.parentPageId, parentPageId)
            : isNull(schema.pages.parentPageId),
        ),
      )
      .orderBy(desc(schema.pages.position))
      .limit(1)

    const currentTime = now()
    const inserted = await db
      .insert(schema.pages)
      .values({
        workspaceId,
        sectionId: input.sectionId,
        parentPageId,
        type,
        title,
        position: positionAfter(lastRows[0]?.position),
        createdBy: actor.id,
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      .returning(pageColumns)

    const page = inserted[0]

    if (!page) {
      throw new Error('Page insert returned no row')
    }

    await touchWorkspace(workspaceId, currentTime)

    return toPageNode(page, false, [])
  }

  async function updatePage(
    actor: Actor,
    workspaceId: string,
    pageId: string,
    input: UpdatePageInput,
  ): Promise<void> {
    const access = await requirePageWrite(db, actor, pageId, workspaceId)

    if (access.page.trashedAt) {
      throw notFound('Page not found')
    }

    const currentTime = now()
    await db
      .update(schema.pages)
      .set({
        title: input.title,
        icon: input.icon,
        cover: input.cover,
        updatedAt: currentTime,
      })
      .where(eq(schema.pages.id, pageId))
    await touchWorkspace(workspaceId, currentTime)
  }

  async function movePage(
    actor: Actor,
    workspaceId: string,
    pageId: string,
    input: MovePageInput,
  ): Promise<void> {
    const access = await requirePageWrite(db, actor, pageId, workspaceId)

    if (access.page.trashedAt) {
      throw notFound('Page not found')
    }

    const section = await findSection(workspaceId, input.sectionId)
    const parentPageId = input.parentPageId ?? null
    const beforePageId = input.beforePageId ?? null

    if (!section) {
      throw notFound('Section not found')
    }

    if (parentPageId) {
      if (parentPageId === pageId) {
        throw badRequest('A page cannot be its own parent')
      }

      const parentRows = await db
        .select({
          sectionId: schema.pages.sectionId,
          trashedAt: schema.pages.trashedAt,
        })
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.id, parentPageId),
            eq(schema.pages.workspaceId, workspaceId),
          ),
        )
        .limit(1)

      const parent = parentRows[0]

      if (!parent || parent.trashedAt) {
        throw notFound('Parent page not found')
      }

      if (parent.sectionId !== input.sectionId) {
        throw badRequest('The parent page must be in the same section')
      }

      const descendants = await descendantIds(pageId, workspaceId)

      if (descendants.has(parentPageId)) {
        throw badRequest('A page cannot be moved inside itself')
      }
    }

    const targetSiblings = await siblingIds(
      workspaceId,
      input.sectionId,
      parentPageId,
      pageId,
    )

    let targetIndex = targetSiblings.length

    if (beforePageId) {
      if (beforePageId === pageId) {
        throw badRequest('A page cannot be placed before itself')
      }

      const beforeIndex = targetSiblings.indexOf(beforePageId)

      if (beforeIndex === -1) {
        throw badRequest('The page to insert before is not in the destination')
      }

      targetIndex = beforeIndex
    }

    const sourceChanged =
      access.page.sectionId !== input.sectionId ||
      access.page.parentPageId !== parentPageId
    const sourceSiblings = sourceChanged
      ? await siblingIds(
          workspaceId,
          access.page.sectionId,
          access.page.parentPageId,
          pageId,
        )
      : []

    const ordered = [...targetSiblings]
    ordered.splice(targetIndex, 0, pageId)
    const currentTime = now()

    await db.transaction(async (tx) => {
      await tx
        .update(schema.pages)
        .set({
          sectionId: input.sectionId,
          parentPageId,
          position: positionForIndex(targetIndex),
          updatedAt: currentTime,
        })
        .where(eq(schema.pages.id, pageId))

      for (const [index, siblingId] of ordered.entries()) {
        await tx
          .update(schema.pages)
          .set({ position: positionForIndex(index) })
          .where(eq(schema.pages.id, siblingId))
      }

      for (const [index, siblingId] of sourceSiblings.entries()) {
        await tx
          .update(schema.pages)
          .set({ position: positionForIndex(index) })
          .where(eq(schema.pages.id, siblingId))
      }
    })

    await touchWorkspace(workspaceId, currentTime)
  }

  async function setFavorite(
    actor: Actor,
    workspaceId: string,
    pageId: string,
    favorite: boolean,
  ): Promise<void> {
    const access = await requirePageRole(db, actor, pageId, 'viewer', workspaceId)

    if (access.page.trashedAt) {
      throw notFound('Page not found')
    }

    if (favorite) {
      await db
        .insert(schema.favorites)
        .values({ userId: actor.id, pageId, createdAt: now() })
        .onConflictDoNothing()
      return
    }

    await db
      .delete(schema.favorites)
      .where(
        and(eq(schema.favorites.userId, actor.id), eq(schema.favorites.pageId, pageId)),
      )
  }

  async function trashPage(actor: Actor, workspaceId: string, pageId: string): Promise<void> {
    const access = await requirePageWrite(db, actor, pageId, workspaceId)

    if (access.page.trashedAt) {
      throw notFound('Page not found')
    }

    const descendants = await descendantIds(pageId, workspaceId)
    const currentTime = now()
    const ids = [pageId, ...descendants]

    await db.transaction(async (tx) => {
      await tx
        .update(schema.pages)
        .set({ trashedAt: currentTime, updatedAt: currentTime })
        .where(and(eq(schema.pages.id, pageId), isNull(schema.pages.trashedAt)))

      if (descendants.size > 0) {
        await tx
          .update(schema.pages)
          .set({ trashedAt: currentTime, updatedAt: currentTime })
          .where(
            and(
              eq(schema.pages.workspaceId, workspaceId),
              inArray(schema.pages.id, ids),
              isNull(schema.pages.trashedAt),
            ),
          )
      }
    })

    await touchWorkspace(workspaceId, currentTime)
  }

  async function restorePage(actor: Actor, workspaceId: string, pageId: string): Promise<void> {
    const access = await requirePageWrite(db, actor, pageId, workspaceId)

    if (!access.page.trashedAt) {
      throw notFound('Page not found')
    }

    if (access.page.parentPageId) {
      const parentRows = await db
        .select({ trashedAt: schema.pages.trashedAt })
        .from(schema.pages)
        .where(eq(schema.pages.id, access.page.parentPageId))
        .limit(1)

      if (!parentRows[0] || parentRows[0].trashedAt) {
        throw conflict('Restore the parent page first')
      }
    }

    const descendants = await descendantIds(pageId, workspaceId)
    const currentTime = now()
    const ids = [pageId, ...descendants]

    await db
      .update(schema.pages)
      .set({ trashedAt: null, updatedAt: currentTime })
      .where(
        and(
          eq(schema.pages.workspaceId, workspaceId),
          inArray(schema.pages.id, ids),
          isNotNull(schema.pages.trashedAt),
        ),
      )

    await touchWorkspace(workspaceId, currentTime)
  }

  async function purgePage(actor: Actor, workspaceId: string, pageId: string): Promise<void> {
    const access = await requirePageWrite(db, actor, pageId, workspaceId)

    if (!access.page.trashedAt) {
      throw notFound('Page not found')
    }

    await db
      .delete(schema.pages)
      .where(and(eq(schema.pages.id, pageId), eq(schema.pages.workspaceId, workspaceId)))
    await touchWorkspace(workspaceId, now())
  }

  return {
    getHierarchy,
    getPageDetail,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    createSection,
    updateSection,
    deleteSection,
    createPage,
    updatePage,
    movePage,
    setFavorite,
    trashPage,
    restorePage,
    purgePage,
  }
}

export type HierarchyService = ReturnType<typeof createHierarchyService>
