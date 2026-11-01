import { expect, test } from '@playwright/test'
import { createWorkspace, signUp, uniqueEmail } from './helpers'

test.setTimeout(90_000)

test('builds a library, moves a page, favorites it, and restores it from trash', async ({
  page,
}) => {
  const email = uniqueEmail('hierarchy')
  await signUp(page, { name: 'Ari Lane', email })
  const workspaceId = await createWorkspace(page, 'Field Notes')

  await page.getByRole('button', { name: '+ Notebook' }).click()
  await page.getByLabel('Notebook name').fill('Research')
  await page.getByLabel('Notebook icon').selectOption('📚')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await expect(page.getByRole('heading', { name: 'Research', exact: true })).toBeVisible()
  await expect(page.getByText('Notebook created')).toBeVisible()

  await page.getByRole('button', { name: '+ Section' }).click()
  await page.getByLabel('Section name').fill('Sources')
  await page.getByLabel('Section color').selectOption('#6E8B74')
  await page.getByRole('button', { name: 'Create section' }).click()
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()

  await page.getByRole('button', { name: 'Add a page to Sources' }).click()
  await page.getByLabel('Page title').fill('Reading list')
  await page.getByRole('button', { name: 'Create page' }).click()
  await page.waitForURL(new RegExp(`/w/${workspaceId}/p/`))
  await expect(page.getByRole('heading', { name: 'Reading list' })).toBeVisible()

  await page.getByRole('button', { name: 'Add to favorites' }).click()
  await expect(page.getByRole('button', { name: 'Favorited' })).toBeVisible()

  await page.getByLabel('Title', { exact: true }).fill('Reading queue')
  await page.getByLabel('Icon', { exact: true }).selectOption('🪶')
  await page.getByLabel('Cover', { exact: true }).selectOption('linen')
  await page.getByRole('button', { name: 'Save details' }).click()
  await expect(page.getByRole('heading', { name: 'Reading queue' })).toBeVisible()
  await expect(page.getByText('Page details saved')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/workspace-hierarchy.png', fullPage: true })

  await page.getByLabel('Child page title').fill('Chapter one')
  await page.getByRole('button', { name: 'Create child page' }).click()
  await page.waitForURL(new RegExp(`/w/${workspaceId}/p/`))
  await expect(page.getByRole('heading', { name: 'Chapter one' })).toBeVisible()

  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(breadcrumb.getByRole('link', { name: 'Reading queue' })).toBeVisible()
  await breadcrumb.getByRole('link', { name: 'Reading queue' }).click()
  await expect(page.getByRole('heading', { name: 'Reading queue' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Chapter one', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '+ Section' }).click()
  await page.getByLabel('Section name').fill('Ideas')
  await page.getByLabel('Section color').selectOption('#D9A441')
  await page.getByRole('button', { name: 'Create section' }).click()
  await expect(page.getByRole('heading', { name: 'Ideas' })).toBeVisible()

  await page
    .getByRole('button', { name: 'Drag Reading queue' })
    .dragTo(page.getByRole('heading', { name: 'Ideas' }))
  await expect(page.getByText('Page moved')).toBeVisible()
  await expect(breadcrumb.getByText('Ideas')).toBeVisible()

  await page.getByRole('button', { name: 'Move this page to trash' }).click()
  await page.getByRole('button', { name: 'Confirm move to trash' }).click()
  await page.waitForURL(new RegExp(`/w/${workspaceId}$`))

  const sidebar = page.getByRole('complementary', { name: 'Library' })
  await sidebar.getByRole('link', { name: 'Trash' }).click()
  await page.waitForURL(new RegExp(`/w/${workspaceId}/trash$`))
  await expect(page.getByRole('heading', { name: 'Removed pages.' })).toBeVisible()
  await expect(page.getByRole('main').getByText('Reading queue')).toBeVisible()
  await expect(page.getByText(/1 nested page/)).toBeVisible()

  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText(/restored/)).toBeVisible()
  await expect(page.getByText('The trash is empty.')).toBeVisible()
})
