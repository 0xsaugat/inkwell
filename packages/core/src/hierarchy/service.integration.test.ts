import { randomUUID } from 'node:crypto'
import { closeDb, getDb } from '@inkwell/db'
import { afterAll, describe, expect, it } from 'vitest'
import { createAuthService } from '../auth/service'
import { getEnv } from '../env'
import type { ServiceDeps } from '../service-context'
import { MemoryMailer, extractInviteToken } from '../testing/memory-mailer'
import { createWorkspaceService } from '../workspaces/service'
import { createHierarchyService } from './service'

const mailer = new MemoryMailer()
const db = getDb()
const env = getEnv()
const deps: ServiceDeps = { db, env, mailer }
const auth = createAuthService(deps)
const workspaces = createWorkspaceService(deps)
const hierarchy = createHierarchyService(deps)

function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`
}

async function signUp(prefix: string) {
  const email = uniqueEmail(prefix)
  const result = await auth.signUp({
    name: `${prefix} user`,
    email,
    password: 'hierarchy-password-123',
  })

  return { email, user: result.user }
}

async function addMember(
  owner: Awaited<ReturnType<typeof signUp>>,
  workspaceId: string,
  member: Awaited<ReturnType<typeof signUp>>,
  role: 'editor' | 'viewer',
) {
  await workspaces.createInvite(owner.user, workspaceId, { email: member.email, role })
  const token = extractInviteToken(mailer.lastTo(member.email).text)
  await workspaces.acceptInvite(member.user, token)
}

async function seedWorkspace(prefix: string) {
  const owner = await signUp(`${prefix}-owner`)
  const workspace = await workspaces.createWorkspace(owner.user, { name: `${prefix} workspace` })
  const notebook = await hierarchy.createNotebook(owner.user, workspace.id, {
    name: 'Research',
    icon: '📚',
  })
  const section = await hierarchy.createSection(owner.user, workspace.id, {
    notebookId: notebook.id,
    name: 'Sources',
    color: '#6E8B74',
  })

  return { owner, workspace, notebook, section }
}

afterAll(async () => {
  await closeDb()
})

describe('hierarchy service integration', () => {
  it('builds notebooks, sections, nested pages, and favorites', async () => {
    const { owner, workspace, notebook, section } = await seedWorkspace('build')

    const journal = await hierarchy.createNotebook(owner.user, workspace.id, {
      name: 'Journal',
      icon: null,
    })
    const ideas = await hierarchy.createSection(owner.user, workspace.id, {
      notebookId: notebook.id,
      name: 'Ideas',
      color: '#D9A441',
    })
    const reading = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Reading list',
    })
    const quotes = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Quotes',
    })
    const chapter = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      parentPageId: reading.id,
      title: 'Chapter one',
    })

    await hierarchy.updatePage(owner.user, workspace.id, reading.id, {
      title: 'Reading queue',
      icon: '📖',
      cover: 'linen',
    })
    await hierarchy.setFavorite(owner.user, workspace.id, quotes.id, true)

    const view = await hierarchy.getHierarchy(owner.user, workspace.id)

    expect(view.role).toBe('owner')
    expect(view.notebooks.map((entry) => entry.name)).toEqual(['Research', 'Journal'])
    expect(view.notebooks[0]?.pageCount).toBe(3)
    expect(view.notebooks[1]?.pageCount).toBe(0)
    expect(view.notebooks[0]?.sections.map((entry) => entry.name)).toEqual(['Sources', 'Ideas'])
    expect(view.notebooks[0]?.sections[0]?.pages.map((entry) => entry.title)).toEqual([
      'Reading queue',
      'Quotes',
    ])
    expect(view.notebooks[0]?.sections[0]?.pages[0]?.children.map((entry) => entry.title)).toEqual(
      ['Chapter one'],
    )
    expect(view.notebooks[0]?.sections[0]?.pages[0]?.icon).toBe('📖')
    expect(view.notebooks[0]?.sections[0]?.pages[0]?.cover).toBe('linen')
    expect(view.favorites.map((entry) => entry.id)).toEqual([quotes.id])
    expect(view.trash).toEqual([])

    const detail = await hierarchy.getPageDetail(owner.user, workspace.id, reading.id)
    expect(detail.page.title).toBe('Reading queue')
    expect(detail.page.children.map((entry) => entry.id)).toEqual([chapter.id])
    expect(detail.section).toMatchObject({ id: section.id, name: 'Sources' })
    expect(detail.notebook).toMatchObject({ id: notebook.id, name: 'Research' })
    expect(detail.ancestors).toEqual([])

    const childDetail = await hierarchy.getPageDetail(owner.user, workspace.id, chapter.id)
    expect(childDetail.ancestors).toEqual([{ id: reading.id, title: 'Reading queue' }])

    await hierarchy.setFavorite(owner.user, workspace.id, quotes.id, false)
    const cleared = await hierarchy.getHierarchy(owner.user, workspace.id)
    expect(cleared.favorites).toEqual([])
    expect(journal.icon).toBeNull()
  })

  it('moves pages across sections and refuses cycles or foreign targets', async () => {
    const { owner, workspace, section } = await seedWorkspace('move')
    const other = await seedWorkspace('move-other')
    const secondNotebook = await hierarchy.createNotebook(owner.user, workspace.id, {
      name: 'Second',
      icon: null,
    })
    const secondSection = await hierarchy.createSection(owner.user, workspace.id, {
      notebookId: secondNotebook.id,
      name: 'Inbox',
      color: '#8A6FA8',
    })

    const alpha = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Alpha',
    })
    const beta = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Beta',
    })
    const gamma = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Gamma',
    })

    await hierarchy.movePage(owner.user, workspace.id, gamma.id, {
      sectionId: section.id,
      parentPageId: null,
      beforePageId: alpha.id,
    })

    let view = await hierarchy.getHierarchy(owner.user, workspace.id)
    expect(view.notebooks[0]?.sections[0]?.pages.map((entry) => entry.title)).toEqual([
      'Gamma',
      'Alpha',
      'Beta',
    ])

    await hierarchy.movePage(owner.user, workspace.id, beta.id, {
      sectionId: section.id,
      parentPageId: alpha.id,
      beforePageId: null,
    })

    view = await hierarchy.getHierarchy(owner.user, workspace.id)
    const alphaNode = view.notebooks[0]?.sections[0]?.pages.find((entry) => entry.id === alpha.id)
    expect(alphaNode?.children.map((entry) => entry.title)).toEqual(['Beta'])
    expect(view.notebooks[0]?.sections[0]?.pages.map((entry) => entry.title)).toEqual([
      'Gamma',
      'Alpha',
    ])

    await expect(
      hierarchy.movePage(owner.user, workspace.id, alpha.id, {
        sectionId: section.id,
        parentPageId: beta.id,
        beforePageId: null,
      }),
    ).rejects.toMatchObject({ code: 'bad_request' })

    await hierarchy.movePage(owner.user, workspace.id, beta.id, {
      sectionId: secondSection.id,
      parentPageId: null,
      beforePageId: null,
    })

    view = await hierarchy.getHierarchy(owner.user, workspace.id)
    const secondSectionView = view.notebooks[1]?.sections[0]
    expect(secondSectionView?.pages.map((entry) => entry.title)).toEqual(['Beta'])

    await expect(
      hierarchy.movePage(owner.user, workspace.id, alpha.id, {
        sectionId: other.section.id,
        parentPageId: null,
        beforePageId: null,
      }),
    ).rejects.toMatchObject({ code: 'not_found' })

    await expect(
      hierarchy.movePage(owner.user, workspace.id, alpha.id, {
        sectionId: section.id,
        parentPageId: null,
        beforePageId: beta.id,
      }),
    ).rejects.toMatchObject({ code: 'bad_request' })

    await expect(
      hierarchy.movePage(owner.user, workspace.id, alpha.id, {
        sectionId: section.id,
        parentPageId: alpha.id,
        beforePageId: null,
      }),
    ).rejects.toMatchObject({ code: 'bad_request' })
  })

  it('lets viewers read and favorite but blocks every write', async () => {
    const { owner, workspace, notebook, section } = await seedWorkspace('viewer')
    const viewer = await signUp('viewer-member')
    const editor = await signUp('editor-member')
    await addMember(owner, workspace.id, viewer, 'viewer')
    await addMember(owner, workspace.id, editor, 'editor')

    const page = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Shared page',
    })

    const view = await hierarchy.getHierarchy(viewer.user, workspace.id)
    expect(view.role).toBe('viewer')
    await hierarchy.setFavorite(viewer.user, workspace.id, page.id, true)

    await expect(
      hierarchy.createNotebook(viewer.user, workspace.id, { name: 'Nope', icon: null }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      hierarchy.createSection(viewer.user, workspace.id, {
        notebookId: notebook.id,
        name: 'Nope',
        color: '#D9A441',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      hierarchy.createPage(viewer.user, workspace.id, {
        sectionId: section.id,
        title: 'Nope',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      hierarchy.updatePage(viewer.user, workspace.id, page.id, {
        title: 'Nope',
        icon: null,
        cover: null,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      hierarchy.movePage(viewer.user, workspace.id, page.id, {
        sectionId: section.id,
        parentPageId: null,
        beforePageId: null,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(hierarchy.trashPage(viewer.user, workspace.id, page.id)).rejects.toMatchObject({
      code: 'forbidden',
    })

    await hierarchy.updatePage(editor.user, workspace.id, page.id, {
      title: 'Editor renamed',
      icon: '🌿',
      cover: null,
    })
    const renamed = await hierarchy.getPageDetail(editor.user, workspace.id, page.id)
    expect(renamed.page.title).toBe('Editor renamed')

    const outsider = await signUp('outsider')
    await expect(hierarchy.getHierarchy(outsider.user, workspace.id)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(
      hierarchy.getPageDetail(outsider.user, workspace.id, page.id),
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('trashes whole subtrees, restores them, and purges on demand', async () => {
    const { owner, workspace, section } = await seedWorkspace('trash')

    const parent = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Parent',
    })
    const child = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      parentPageId: parent.id,
      title: 'Child',
    })
    const grandchild = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      parentPageId: child.id,
      title: 'Grandchild',
    })
    const sibling = await hierarchy.createPage(owner.user, workspace.id, {
      sectionId: section.id,
      title: 'Sibling',
    })

    await hierarchy.trashPage(owner.user, workspace.id, parent.id)

    let view = await hierarchy.getHierarchy(owner.user, workspace.id)
    expect(view.notebooks[0]?.sections[0]?.pages.map((entry) => entry.id)).toEqual([sibling.id])
    expect(view.trash).toHaveLength(1)
    expect(view.trash[0]).toMatchObject({
      id: parent.id,
      descendantCount: 2,
      sectionName: 'Sources',
    })

    await expect(
      hierarchy.getPageDetail(owner.user, workspace.id, child.id),
    ).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      hierarchy.restorePage(owner.user, workspace.id, child.id),
    ).rejects.toMatchObject({ code: 'conflict' })

    await hierarchy.restorePage(owner.user, workspace.id, parent.id)
    view = await hierarchy.getHierarchy(owner.user, workspace.id)
    expect(view.trash).toEqual([])
    expect(view.notebooks[0]?.sections[0]?.pages.map((entry) => entry.id)).toEqual([
      parent.id,
      sibling.id,
    ])

    const restoredChild = await hierarchy.getPageDetail(owner.user, workspace.id, child.id)
    expect(restoredChild.ancestors).toEqual([{ id: parent.id, title: 'Parent' }])

    await hierarchy.trashPage(owner.user, workspace.id, parent.id)
    await hierarchy.purgePage(owner.user, workspace.id, parent.id)

    view = await hierarchy.getHierarchy(owner.user, workspace.id)
    expect(view.trash).toEqual([])
    await expect(
      hierarchy.getPageDetail(owner.user, workspace.id, grandchild.id),
    ).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      hierarchy.getPageDetail(owner.user, workspace.id, sibling.id),
    ).resolves.toMatchObject({ page: { title: 'Sibling' } })
  })
})
