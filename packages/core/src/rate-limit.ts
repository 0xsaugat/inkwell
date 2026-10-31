export type RateLimitDecision = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  limit: number
}

type Bucket = {
  count: number
  resetAt: number
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 20_000,
  ) {}

  consume(key: string, limit: number, windowMs: number): RateLimitDecision {
    const currentTime = this.now()
    this.prune(currentTime)

    const existing = this.buckets.get(key)

    if (!existing || existing.resetAt <= currentTime) {
      this.buckets.set(key, { count: 1, resetAt: currentTime + windowMs })
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0, limit }
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1_000)),
        limit,
      }
    }

    existing.count += 1

    return {
      allowed: true,
      remaining: limit - existing.count,
      retryAfterSeconds: 0,
      limit,
    }
  }

  reset(key?: string): void {
    if (key === undefined) {
      this.buckets.clear()
      return
    }

    this.buckets.delete(key)
  }

  private prune(currentTime: number): void {
    if (this.buckets.size < this.maxEntries) {
      return
    }

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= currentTime) {
        this.buckets.delete(key)
      }
    }
  }
}
