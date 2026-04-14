/**
 * route-guards tests
 *
 * Validates that requirePermission() and requireRole() redirect to /unauthorized
 * when the user lacks access, and pass through when access is granted.
 * Uses getState() (non-reactive) so no React context needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requirePermission, requireRole } from '@/lib/route-guards'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetState = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}))

// redirect must return something throwable
const mockRedirect = vi.fn((opts: { to: string }) => new Error(`redirect:${opts.to}`))

vi.mock('@tanstack/react-router', () => ({
  redirect: (opts: { to: string }) => mockRedirect(opts),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupState({
  isAuthenticated = true,
  isAdmin = false,
  isSuperAdmin = false,
  permissions = [] as string[],
} = {}) {
  mockGetState.mockReturnValue({
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    can: (p: string) => isAdmin || isSuperAdmin || permissions.includes(p),
  })
}

// ─── requirePermission ────────────────────────────────────────────────────────

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupState()
  })

  it('does not redirect when user has the required permission', () => {
    setupState({ permissions: ['employees.view'] })
    const guard = requirePermission('employees.view')
    expect(() => guard()).not.toThrow()
  })

  it('redirects to /unauthorized when permission is missing', () => {
    setupState({ permissions: [] })
    const guard = requirePermission('employees.view')
    expect(() => guard()).toThrow('redirect:/unauthorized')
  })

  it('does not redirect when user is admin (bypass)', () => {
    setupState({ isAdmin: true })
    const guard = requirePermission('employees.view')
    expect(() => guard()).not.toThrow()
  })

  it('does not redirect when user is super-admin (bypass)', () => {
    setupState({ isAdmin: true, isSuperAdmin: true })
    const guard = requirePermission('any.permission')
    expect(() => guard()).not.toThrow()
  })

  it('redirects to /login when user is unauthenticated', () => {
    setupState({ isAuthenticated: false })
    const guard = requirePermission('employees.view')
    expect(() => guard()).toThrow('redirect:/login')
  })

  it('guards items.view permission correctly', () => {
    setupState({ permissions: ['items.view'] })
    expect(() => requirePermission('items.view')()).not.toThrow()
    expect(() => requirePermission('employees.view')()).toThrow('redirect:/unauthorized')
  })

  it('guards stock.view permission correctly', () => {
    setupState({ permissions: ['stock.view'] })
    expect(() => requirePermission('stock.view')()).not.toThrow()
    expect(() => requirePermission('items.view')()).toThrow('redirect:/unauthorized')
  })
})

// ─── requireRole ──────────────────────────────────────────────────────────────

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupState()
  })

  it('does not redirect when user is super-admin and role is super-admin', () => {
    setupState({ isAdmin: true, isSuperAdmin: true })
    const guard = requireRole('super-admin')
    expect(() => guard()).not.toThrow()
  })

  it('redirects to /unauthorized when user is admin but role requires super-admin', () => {
    setupState({ isAdmin: true, isSuperAdmin: false })
    const guard = requireRole('super-admin')
    expect(() => guard()).toThrow('redirect:/unauthorized')
  })

  it('redirects to /unauthorized when user has no roles and super-admin required', () => {
    setupState({ isAdmin: false, isSuperAdmin: false })
    const guard = requireRole('super-admin')
    expect(() => guard()).toThrow('redirect:/unauthorized')
  })

  it('does not redirect when user is admin and role is admin', () => {
    setupState({ isAdmin: true })
    const guard = requireRole('admin')
    expect(() => guard()).not.toThrow()
  })

  it('redirects to /unauthorized when user is not admin and role is admin', () => {
    setupState({ isAdmin: false })
    const guard = requireRole('admin')
    expect(() => guard()).toThrow('redirect:/unauthorized')
  })

  it('redirects to /login when unauthenticated', () => {
    setupState({ isAuthenticated: false })
    const guard = requireRole('super-admin')
    expect(() => guard()).toThrow('redirect:/login')
  })
})
