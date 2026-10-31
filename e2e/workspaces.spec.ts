import { expect, test } from '@playwright/test'
import {
  createWorkspace,
  extractLinkPath,
  fillSignUp,
  getCsrfToken,
  signUp,
  uniqueEmail,
  waitForEmail,
} from './helpers'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

test('two users share a workspace and a viewer cannot write', async ({ browser, page }) => {
  const ownerEmail = uniqueEmail('owner')
  const viewerEmail = uniqueEmail('viewer')

  await signUp(page, { name: 'Maya Chen', email: ownerEmail })
  await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible()

  const workspaceId = await createWorkspace(page, 'Field Notes')
  await expect(page.getByRole('heading', { name: 'Field Notes' })).toBeVisible()
  await expect(page.getByText('1 member', { exact: true })).toBeVisible()

  await page.getByLabel('Email address').fill(viewerEmail)
  await page.getByLabel('Invite role').selectOption('viewer')
  await page.getByRole('button', { name: 'Send invite' }).click()
  await expect(page.getByText(`Invite sent to ${viewerEmail}`)).toBeVisible({ timeout: 15_000 })

  const inviteEmail = await waitForEmail(viewerEmail)
  const invitePath = extractLinkPath(
    `${inviteEmail.HTML}\n${inviteEmail.Text}`,
    /\/invite\/[A-Za-z0-9_-]+/,
  )

  const viewerContext = await browser.newContext()
  const viewerPage = await viewerContext.newPage()

  try {
    await viewerPage.goto(invitePath)
    await expect(viewerPage.getByRole('heading', { name: 'Join Field Notes.' })).toBeVisible()
    await viewerPage.getByRole('link', { name: 'Create your account' }).click()
    await viewerPage.waitForURL('**/signup**')
    await expect(viewerPage.getByLabel('Email', { exact: true })).toHaveValue(viewerEmail)

    await fillSignUp(viewerPage, { name: 'Jon Bell', email: viewerEmail })
    await viewerPage.getByRole('button', { name: 'Create account' }).click()
    await viewerPage.waitForURL('**/invite/**')
    await viewerPage.getByRole('button', { name: 'Accept invite' }).click()
    await viewerPage.waitForURL(`**/w/${workspaceId}`)

    await expect(viewerPage.getByRole('heading', { name: 'Field Notes' })).toBeVisible()
    await expect(viewerPage.getByText('2 members', { exact: true })).toBeVisible()
    await expect(viewerPage.getByRole('heading', { name: 'Invite someone' })).toHaveCount(0)

    const csrfToken = await getCsrfToken(viewerPage)
    expect(csrfToken).not.toBeNull()

    const viewerWrite = await viewerPage.evaluate(
      async ({ id, token }) => {
        const response = await fetch(`/api/workspaces/${id}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': token ?? '',
          },
          body: JSON.stringify({ name: 'Viewer takeover' }),
        })

        return { status: response.status, body: (await response.json()) as unknown }
      },
      { id: workspaceId, token: csrfToken },
    )

    expect(viewerWrite.status).toBe(403)
    expect(viewerWrite.body).toMatchObject({ error: { code: 'forbidden' } })

    await page.reload()
    await expect(page.getByText('2 members', { exact: true })).toBeVisible()
    await expect(page.getByText(viewerEmail)).toBeVisible()

    await page.screenshot({
      path: 'docs/screenshots/workspace-members.png',
      fullPage: true,
    })
  } finally {
    await viewerContext.close()
  }
})
