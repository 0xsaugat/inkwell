import { z } from 'zod'
import { loadEnv } from './load-env'

const databaseUrlSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
    message: 'DATABASE_URL must be a PostgreSQL connection string',
  })

export function getDatabaseUrl(): string {
  loadEnv()

  const parsed = databaseUrlSchema.safeParse(process.env.DATABASE_URL)

  if (!parsed.success) {
    throw new Error('DATABASE_URL is missing or invalid')
  }

  return parsed.data
}
