import { RateLimiter, rateLimited } from '@inkwell/core'

const globalForLimits = globalThis as typeof globalThis & {
  __inkwellRateLimiter?: RateLimiter
}

export function getRateLimiter(): RateLimiter {
  globalForLimits.__inkwellRateLimiter ??= new RateLimiter()
  return globalForLimits.__inkwellRateLimiter
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message: string,
): void {
  const decision = getRateLimiter().consume(key, limit, windowMs)

  if (!decision.allowed) {
    throw rateLimited(message, decision.retryAfterSeconds)
  }
}
