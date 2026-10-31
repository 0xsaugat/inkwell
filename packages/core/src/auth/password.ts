import { hash, verify, type Algorithm } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2 as Algorithm,
} as const

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

let dummyHash: Promise<string> | null = null

export async function consumeFakePasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('inkwell-dummy-password')
  await verifyPassword(await dummyHash, password)
}
