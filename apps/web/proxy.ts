import { NextResponse, type NextRequest } from 'next/server'
import { createCsrfToken, CSRF_COOKIE_NAME, csrfCookieOptions } from './lib/cookies'

const CSRF_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
const PROTECTED_PREFIXES = ['/app', '/w/']

function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (existing && /^[a-f0-9]{64}$/.test(existing)) {
    return response
  }

  const secure =
    request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'

  response.cookies.set(
    CSRF_COOKIE_NAME,
    createCsrfToken(),
    csrfCookieOptions(secure, CSRF_MAX_AGE_SECONDS),
  )

  return response
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  const cookieName = process.env.AUTH_COOKIE_NAME ?? 'inkwell_session'
  const hasSession = Boolean(request.cookies.get(cookieName)?.value)
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  )

  if (needsAuth && !hasSession) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/signin'
    signInUrl.search = ''
    signInUrl.searchParams.set('next', `${pathname}${search}`)
    return ensureCsrfCookie(request, NextResponse.redirect(signInUrl))
  }

  return ensureCsrfCookie(request, NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
}
