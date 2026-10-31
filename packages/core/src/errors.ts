export type AppErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'rate_limited'
  | 'email_failed'
  | 'internal_error'

export type ErrorDetails = Record<string, unknown> | unknown[]

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: ErrorDetails
  readonly retryAfterSeconds?: number

  constructor(
    code: AppErrorCode,
    status: number,
    message: string,
    options: { details?: ErrorDetails; retryAfterSeconds?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = options.details
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

export function badRequest(message: string, details?: ErrorDetails): AppError {
  return new AppError('bad_request', 400, message, { details })
}

export function unauthorized(message = 'Sign in to continue'): AppError {
  return new AppError('unauthorized', 401, message)
}

export function forbidden(message = 'You do not have permission to do that'): AppError {
  return new AppError('forbidden', 403, message)
}

export function notFound(message = 'Not found'): AppError {
  return new AppError('not_found', 404, message)
}

export function conflict(message: string): AppError {
  return new AppError('conflict', 409, message)
}

export function validationError(
  message: string,
  details?: ErrorDetails,
): AppError {
  return new AppError('validation_error', 400, message, { details })
}

export function rateLimited(message: string, retryAfterSeconds: number): AppError {
  return new AppError('rate_limited', 429, message, { retryAfterSeconds })
}

export function emailFailed(message: string, cause?: unknown): AppError {
  return new AppError('email_failed', 502, message, { cause })
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}
