import {
  AppError,
  createLogger,
  getEnv,
  notFound,
  unauthorized,
  validationError,
  type SessionUser,
} from '@inkwell/core'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { z } from 'zod'
import { getServices } from './services'
import {
  cookieSecurity,
  CSRF_COOKIE_NAME,
  csrfCookieOptions,
  sessionCookieOptions,
} from './cookies'

const log = createLogger('web-api')

type RouteContext = { params: Promise<Record<string, string>> }

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  })
}

export async function parseJson<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    throw validationError('Send a valid JSON body')
  }

  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    throw validationError(
      'Check the highlighted fields and try again',
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    )
  }

  return parsed.data
}

export async function parseParams<T extends z.ZodType>(
  paramsPromise: Promise<Record<string, string>>,
  schema: T,
): Promise<z.infer<T>> {
  const params = await paramsPromise
  const parsed = schema.safeParse(params)

  if (!parsed.success) {
    throw notFound()
  }

  return parsed.data
}

export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip') ?? 'local'
}

export function getRequestMeta(request: NextRequest): { ip: string; userAgent: string | null } {
  return {
    ip: getRequestIp(request),
    userAgent: request.headers.get('user-agent'),
  }
}

export async function requireApiActor(): Promise<SessionUser> {
  const cookieStore = await cookies()
  const env = getEnv()
  const token = cookieStore.get(env.AUTH_COOKIE_NAME)?.value

  if (!token) {
    throw unauthorized()
  }

  const session = await getServices().auth.resolve(token)

  if (!session) {
    throw unauthorized('Your session has expired. Sign in again.')
  }

  return session.user
}

export function setSessionCookies(
  response: NextResponse,
  session: { token: string; csrfToken: string; expiresAt: Date },
): void {
  const env = getEnv()
  const secure = cookieSecurity(env)
  const maxAge = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1_000))

  response.cookies.set(env.AUTH_COOKIE_NAME, session.token, sessionCookieOptions(secure, maxAge))
  response.cookies.set(CSRF_COOKIE_NAME, session.csrfToken, csrfCookieOptions(secure, maxAge))
}

export function clearSessionCookies(response: NextResponse): void {
  const env = getEnv()
  const secure = cookieSecurity(env)

  response.cookies.set(env.AUTH_COOKIE_NAME, '', sessionCookieOptions(secure, 0))
  response.cookies.set(CSRF_COOKIE_NAME, '', csrfCookieOptions(secure, 0))
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(getEnv().AUTH_COOKIE_NAME)?.value ?? null
}

export function apiHandler(
  handler: (request: NextRequest, context: RouteContext) => Promise<Response>,
) {
  return async (request: NextRequest, context: RouteContext): Promise<Response> => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof AppError) {
        const headers = new Headers({ 'cache-control': 'no-store' })

        if (error.retryAfterSeconds) {
          headers.set('retry-after', String(error.retryAfterSeconds))
        }

        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          { status: error.status, headers },
        )
      }

      log.error(error, 'Unhandled API error')
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Something went wrong' } },
        { status: 500, headers: { 'cache-control': 'no-store' } },
      )
    }
  }
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
