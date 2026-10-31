import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function createOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url')
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokensEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
