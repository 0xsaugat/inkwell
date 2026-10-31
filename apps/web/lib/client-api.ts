'use client'

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './cookies'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function readCsrfToken(): string | null {
  const prefix = `${CSRF_COOKIE_NAME}=`
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return match ? decodeURIComponent(match.slice(prefix.length)) : null
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')

  if (init.body) {
    headers.set('content-type', 'application/json')
  }

  if (method !== 'GET' && method !== 'HEAD') {
    const token = readCsrfToken()

    if (token) {
      headers.set(CSRF_HEADER_NAME, token)
    }
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? ((await response.json()) as unknown) : null

  if (!response.ok) {
    const body = payload as { error?: { code?: string; message?: string; details?: unknown } } | null
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'request_failed',
      body?.error?.message ?? 'Something went wrong',
      body?.error?.details,
    )
  }

  return payload as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Something went wrong. Try again.'
}
