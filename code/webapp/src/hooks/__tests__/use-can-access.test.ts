// @vitest-environment jsdom
/**
 * useCanAccess hook tests
 *
 * Validates the imperative permission/role check used inside handlers and hooks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanAccess } from '@/hooks/use-can-access'

// ─── Mock auth store ─────────────────────────────────────────────────────────

const mockAuthState = {
  can: vi.fn(),
  isAdmin: false,
  isSuperAdmin: false,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupUser({
  isAdmin = false,
  isSuperAdmin = false,
  permissions = [] as string[],
} = {}) {
  mockAuthState.isAdmin = isAdmin
  mockAuthState.isSuperAdmin = isSuperAdmin
  mockAuthState.can.mockImplementation((p: string) =>
    isAdmin || isSuperAdmin || permissions.includes(p),
  )
}

function check(opts: Parameters<typeof useCanAccess>[0]) {
  const { result } = renderHook(() => useCanAccess(opts))
  return result.current
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setupUser()
})

describe('useCanAccess — no restrictions', () => {
  it('returns true when no permission or role specified', () => {
    expect(check({})).toBe(true)
  })
})

describe('useCanAccess — permission checks', () => {
  it('returns true when user has the required permission', () => {
    setupUser({ permissions: ['employees.view'] })
    expect(check({ permission: 'employees.view' })).toBe(true)
  })

  it('returns false when user lacks the required permission', () => {
    setupUser({ permissions: [] })
    expect(check({ permission: 'employees.view' })).toBe(false)
  })

  it('returns true for admin regardless of specific permission', () => {
    setupUser({ isAdmin: true })
    expect(check({ permission: 'employees.view' })).toBe(true)
    expect(check({ permission: 'any.permission' })).toBe(true)
  })

  it('returns true for super-admin regardless of specific permission', () => {
    setupUser({ isAdmin: true, isSuperAdmin: true })
    expect(check({ permission: 'leaves.approve' })).toBe(true)
  })

  it('returns false when user has different permissions but not the required one', () => {
    setupUser({ permissions: ['items.view', 'stock.view'] })
    expect(check({ permission: 'employees.view' })).toBe(false)
  })
})

describe('useCanAccess — role checks', () => {
  it('returns true for super-admin role when user is super-admin', () => {
    setupUser({ isAdmin: true, isSuperAdmin: true })
    expect(check({ role: 'super-admin' })).toBe(true)
  })

  it('returns false for super-admin role when user is only admin', () => {
    setupUser({ isAdmin: true, isSuperAdmin: false })
    expect(check({ role: 'super-admin' })).toBe(false)
  })

  it('returns true for admin role when user is admin', () => {
    setupUser({ isAdmin: true })
    expect(check({ role: 'admin' })).toBe(true)
  })

  it('returns false for admin role when user is not admin', () => {
    setupUser({ isAdmin: false })
    expect(check({ role: 'admin' })).toBe(false)
  })
})
