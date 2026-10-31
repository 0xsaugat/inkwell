import type { Database } from '@inkwell/db'
import type { Env } from './env'
import type { Mailer } from './mailer'

export type ServiceDeps = {
  db: Database
  env: Env
  mailer: Mailer
  now?: () => Date
}

export function serviceClock(deps: ServiceDeps): () => Date {
  return deps.now ?? (() => new Date())
}
