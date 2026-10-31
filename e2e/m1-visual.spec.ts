import { expect, test } from '@playwright/test'
import { createWorkspace, signUp, uniqueEmail } from './helpers'

test.setTimeout(60_000)

test('captures sign-in and dashboard documentation screenshots', async ({ page }) => {
  await page.goto('/signin')
  await expect(page.getByRole('heading', { name: 'Pick up the thread.' })).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/signin.png', fullPage: true })

  const email = uniqueEmail('visual')
  await signUp(page, { name: 'Sam Rivera', email })

  for (const name of ['Field Notes', 'Studio', 'Reading Room']) {
    await createWorkspace(page, name)
    await page.goto('/app')
  }

  await expect(page.getByRole('heading', { name: 'Field Notes' })).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true })
})
