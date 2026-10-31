import { expect, test } from '@playwright/test'

test('landing page is responsive and captures documentation screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(desktopOverflow).toBe(false)
  await page.screenshot({ path: 'docs/screenshots/landing-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 820, height: 1180 })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const tabletOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(tabletOverflow).toBe(false)
  await page.screenshot({ path: 'docs/screenshots/landing-tablet.png', fullPage: true })
})
