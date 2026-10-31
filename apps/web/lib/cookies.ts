export const CSRF_COOKIE_NAME = 'inkwell_csrf'
export const CSRF_HEADER_NAME = 'x-csrf-token'

export function createCsrfToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '')
}

export function cookieSecurity(env: { APP_URL: string; NODE_ENV: string }): boolean {
  return env.NODE_ENV === 'production' || env.APP_URL.startsWith('https://')
}

export function sessionCookieOptions(secure: boolean, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export function csrfCookieOptions(secure: boolean, maxAgeSeconds: number) {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}
