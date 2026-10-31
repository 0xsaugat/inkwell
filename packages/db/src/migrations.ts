import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getDb, type Database } from './client'

const here = dirname(fileURLToPath(import.meta.url))

export const migrationsFolder = resolve(here, '../drizzle')

export async function waitForDatabase(db: Database = getDb(), maxWaitMs = 30_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs

  for (;;) {
    try {
      await db.execute(sql`select 1`)
      return
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error
      }

      console.log('Waiting for PostgreSQL...')
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000))
    }
  }
}

export async function runMigrations(db: Database = getDb()): Promise<void> {
  await waitForDatabase(db)
  await migrate(db, { migrationsFolder })
}
