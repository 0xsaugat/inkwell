import { describe, expect, it } from 'vitest'
import { canManageWorkspace, canWrite, roleAtLeast } from './authz'

describe('workspace role hierarchy', () => {
  it('allows higher roles to satisfy lower requirements', () => {
    expect(roleAtLeast('owner', 'owner')).toBe(true)
    expect(roleAtLeast('owner', 'editor')).toBe(true)
    expect(roleAtLeast('owner', 'viewer')).toBe(true)
    expect(roleAtLeast('editor', 'owner')).toBe(false)
    expect(roleAtLeast('editor', 'editor')).toBe(true)
    expect(roleAtLeast('editor', 'viewer')).toBe(true)
    expect(roleAtLeast('viewer', 'editor')).toBe(false)
    expect(roleAtLeast('viewer', 'owner')).toBe(false)
    expect(roleAtLeast('viewer', 'viewer')).toBe(true)
  })

  it('distinguishes write access from workspace management', () => {
    expect(canWrite('owner')).toBe(true)
    expect(canWrite('editor')).toBe(true)
    expect(canWrite('viewer')).toBe(false)

    expect(canManageWorkspace('owner')).toBe(true)
    expect(canManageWorkspace('editor')).toBe(false)
    expect(canManageWorkspace('viewer')).toBe(false)
  })
})
