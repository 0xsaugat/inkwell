import { tokensEqual } from '@inkwell/core'
import { getEnv } from '@inkwell/core'
import type { NextRequest } from 'next/server'
import { forbidden } from '@inkwell/core'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './cookies'

export function assertCsrf(request: NextRequest): void {
  const env = getEnv()
  const expectedOrigin = new URL(env.APP_URL).origin
  const origin = request.headers.get('origin')

  if (origin !== null && origin !== expectedOrigin) {
    throw forbidden('Cross-origin request blocked')
  }

  if (origin === null) {
    throw forbidden('Missing request origin')
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || !tokensEqual(cookieToken, headerToken)) {
    throw forbidden('Invalid CSRF token')
  }
}
