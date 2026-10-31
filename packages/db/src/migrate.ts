import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDb, getDb } from './client'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = resolve(here, '../drizzle')
const maxWaitMs = 30_000

async function waitForDatabase(): Promise<void> {
  const db = getDb()
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

async function main(): Promise<void> {
  await waitForDatabase()
  await migrate(getDb(), { migrationsFolder })
  console.log('Migrations applied')
}

main()
  .then(async () => {
    await closeDb()
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await closeDb()
    process.exit(1)
  })
