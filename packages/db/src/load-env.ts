import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { config } from 'dotenv'

let loaded = false

export function loadEnv(): void {
  if (loaded) {
    return
  }

  let directory = process.cwd()

  for (;;) {
    const candidate = join(directory, '.env')

    if (existsSync(candidate)) {
      config({ path: candidate, override: false })
      break
    }

    const parent = dirname(directory)

    if (parent === directory) {
      break
    }

    directory = parent
  }

  loaded = true
}
