import { Client } from 'pg'
import { loadEnv } from '@inkwell/db'

loadEnv()

function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL
  }

  const base = new URL(process.env.DATABASE_URL ?? 'postgresql://inkwell:inkwell@localhost:5433/inkwell')
  const databaseName = base.pathname.replace(/^\//, '')
  base.pathname = `/${databaseName}_test`
  return base.toString()
}

async function ensureDatabase(url: string): Promise<void> {
  const target = new URL(url)
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''))

  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error(`Unsafe test database name: ${databaseName}`)
  }

  const adminUrl = new URL(target)
  adminUrl.pathname = '/postgres'

  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()

  try {
    const existing = await admin.query('select 1 from pg_database where datname = $1', [
      databaseName,
    ])

    if (existing.rowCount === 0) {
      await admin.query(`create database "${databaseName}"`)
    }
  } finally {
    await admin.end()
  }
}

async function resetDatabase(url: string): Promise<void> {
  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    await client.query(`
      drop schema if exists public cascade;
      drop schema if exists drizzle cascade;
      create schema public;
    `)
  } finally {
    await client.end()
  }
}

const url = testDatabaseUrl()

await ensureDatabase(url)
await resetDatabase(url)

process.env.DATABASE_URL = url
process.env.NODE_ENV = 'test'

const { runMigrations } = await import('@inkwell/db')
await runMigrations()
