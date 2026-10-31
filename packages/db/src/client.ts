import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { getDatabaseUrl } from './env'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

type DatabaseState = {
  pool: Pool
  db: Database
}

const globalForDb = globalThis as typeof globalThis & {
  __inkwellDb?: DatabaseState
}

export function getDb(): Database {
  return getDatabaseState().db
}

export function getPool(): Pool {
  return getDatabaseState().pool
}

export async function closeDb(): Promise<void> {
  if (!globalForDb.__inkwellDb) {
    return
  }

  await globalForDb.__inkwellDb.pool.end()
  delete globalForDb.__inkwellDb
}

function getDatabaseState(): DatabaseState {
  if (!globalForDb.__inkwellDb) {
    const pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      connectionTimeoutMillis: 5_000,
    })

    pool.on('error', (error) => {
      console.error('Unexpected PostgreSQL pool error', error.message)
    })

    globalForDb.__inkwellDb = {
      pool,
      db: drizzle(pool, { schema }),
    }
  }

  return globalForDb.__inkwellDb
}
