import { expect, test } from '@playwright/test'
import {
  TEST_PASSWORD,
  extractLinkPath,
  signUp,
  uniqueEmail,
  waitForEmail,
} from './helpers'

test.setTimeout(60_000)

test('password reset sends a mail link and revokes existing sessions', async ({ page }) => {
  const email = uniqueEmail('reset')
  const newPassword = 'brand-new-password-2026'

  await signUp(page, { name: 'Reset Person', email })
  await expect(page).toHaveURL(/\/app$/)

  await page.goto('/forgot-password')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('heading', { name: 'The link is on its way.' })).toBeVisible({
    timeout: 20_000,
  })

  const emailMessage = await waitForEmail(email)
  const resetPath = extractLinkPath(
    `${emailMessage.HTML}\n${emailMessage.Text}`,
    /\/reset-password\?token=[A-Za-z0-9_-]+/,
  )

  await page.goto(resetPath)
  await page.getByLabel('New password', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirm new password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByRole('heading', { name: 'Password updated.' })).toBeVisible({
    timeout: 20_000,
  })

  await page.goto('/app')
  await expect(page).toHaveURL(/\/signin/)

  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email or password is incorrect')).toBeVisible({ timeout: 15_000 })

  await page.getByLabel('Password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible()
})
