import { expect, test } from '@playwright/test'

test('landing page and health endpoint are live', async ({ page, request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBe(true)

  const health = (await response.json()) as {
    status: string
    db: string
    version: string
  }
  expect(health.status).toBe('ok')
  expect(health.db).toBe('ok')
  expect(health.version).toBeTruthy()

  await page.goto('/')
  await expect(page).toHaveTitle(/Inkwell/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Think in pages')
  await expect(page.getByText('Stack online')).toBeVisible()
})
