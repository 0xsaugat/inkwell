import {
  createAuthService,
  createHierarchyService,
  createSmtpMailer,
  createWorkspaceService,
  getEnv,
  type AuthService,
  type HierarchyService,
  type WorkspaceService,
} from '@inkwell/core'
import { getDb } from '@inkwell/db'

type Services = {
  auth: AuthService
  workspaces: WorkspaceService
  hierarchy: HierarchyService
}

const globalForServices = globalThis as typeof globalThis & {
  __inkwellServices?: Services
}

export function getServices(): Services {
  if (!globalForServices.__inkwellServices) {
    const env = getEnv()
    const deps = {
      db: getDb(),
      env,
      mailer: createSmtpMailer(env),
    }

    globalForServices.__inkwellServices = {
      auth: createAuthService(deps),
      workspaces: createWorkspaceService(deps),
      hierarchy: createHierarchyService(deps),
    }
  }

  return globalForServices.__inkwellServices
}
