import type { Page } from '@playwright/test'

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'

type MailSummary = {
  ID: string
  To: Array<{ Address: string }>
  Subject: string
}

type MailMessage = MailSummary & {
  Text: string
  HTML: string
}

export const TEST_PASSWORD = 'test-workspace-password'

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

export async function waitForEmail(to: string, timeoutMs = 15_000): Promise<MailMessage> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    )

    if (response.ok) {
      const payload = (await response.json()) as { messages?: MailSummary[] }
      const summary = payload.messages?.find((message) =>
        message.To.some((recipient) => recipient.Address === to),
      )

      if (summary) {
        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${summary.ID}`)

        if (detail.ok) {
          return (await detail.json()) as MailMessage
        }
      }
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }

  throw new Error(`Timed out waiting for email to ${to}`)
}

export function extractLinkPath(message: string, pattern: RegExp): string {
  const match = message.match(pattern)

  if (!match?.[0]) {
    throw new Error('Expected link was not found in the email')
  }

  return match[0]
}

export async function fillSignUp(
  page: Page,
  input: { name: string; email: string },
): Promise<void> {
  await page.getByLabel('Name', { exact: true }).fill(input.name)
  await page.getByLabel('Email', { exact: true }).fill(input.email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByLabel('Confirm password', { exact: true }).fill(TEST_PASSWORD)
}

export async function signUp(page: Page, input: { name: string; email: string }): Promise<void> {
  await page.goto('/signup')
  await fillSignUp(page, input)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('**/app')
}

export async function createWorkspace(page: Page, name: string): Promise<string> {
  await page.getByLabel('Workspace name').fill(name)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await page.waitForURL(/\/w\/[0-9a-f-]+$/)

  const workspaceId = new URL(page.url()).pathname.split('/').filter(Boolean).pop()

  if (!workspaceId) {
    throw new Error('Workspace id missing from URL')
  }

  return workspaceId
}

export async function getCsrfToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const prefix = 'inkwell_csrf='
    const match = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))

    return match ? decodeURIComponent(match.slice(prefix.length)) : null
  })
}
