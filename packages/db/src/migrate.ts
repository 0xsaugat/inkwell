import { closeDb } from './client'
import { runMigrations } from './migrations'

async function main(): Promise<void> {
  await runMigrations()
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
