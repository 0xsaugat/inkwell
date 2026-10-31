import { getDb } from '@inkwell/db'
import { APP_VERSION, type Health } from '@inkwell/shared'
import { sql } from 'drizzle-orm'

export async function getHealth(): Promise<Health> {
  let db: Health['db'] = 'ok'

  try {
    await getDb().execute(sql`select 1`)
  } catch {
    db = 'down'
  }

  return {
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  }
}
