/**
 * route-guards tests
 *
 * Validates that requirePermission() and requireRole() redirect to /unauthorized
 * when the user lacks access, and pass through when access is granted.
 * Uses getState() (non-reactive) so no React context needed.
 *
 * requireRole now uses checkIsAdmin/checkIsSuperAdmin computed from persisted
 * user.roles to avoid a rehydration race condition.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requirePermission, requireRole, requireDev } from '@/lib/route-guards'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetState = vi.fn()
const mockCheckIsAdmin = vi.fn()
const mockCheckIsSuperAdmin = vi.fn()

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
  checkIsAdmin: (user: unknown) => mockCheckIsAdmin(user),
  checkIsSuperAdmin: (user: unknown) => mockCheckIsSuperAdmin(user),
}))

// redirect must return something throwable
const mockRedirect = vi.fn((opts: { to: string }) => new Error(`redirect:${opts.to}`))

vi.mock('@tanstack/react-router', () => ({
  redirect: (opts: { to: string }) => mockRedirect(opts),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface SetupOptions {
  isAuthenticated?: boolean
  isAdmin?: boolean
  isSuperAdmin?: boolean
  permissions?: string[]
}

function setupState({
  isAuthenticated = true,
  isAdmin = false,
  isSuperAdmin = false,
  permissions = [] as string[],
}: SetupOptions = {}) {
  const user = isAuthenticated ? { roles: [], permissions: [] } : null
  mockGetState.mockReturnValue({
    isAuthenticated,
    user,
    can: (p: string) => isAdmin || isSuperAdmin || permissions.includes(p),
  })
  mockCheckIsAdmin.mockReturnValue(isAdmin)
  mockCheckIsSuperAdmin.mockReturnValue(isSuperAdmin)
}

// ─── requirePermission ────────────────────────────────────────────────────────

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupState()
  })

  it('does not redirect when user has the required permission', () => {
    setupState({ permissions: ['employees.view'] })
    expect(() => requirePermission('employees.view')()).not.toThrow()
  })

  it('redirects to /unauthorized when permission is missing', () => {
    setupState({ permissions: [] })
    expect(() => requirePermission('employees.view')()).toThrow('redirect:/unauthorized')
  })

  it('does not redirect when user is admin (bypass via can())', () => {
    setupState({ isAdmin: true })
    expect(() => requirePermission('employees.view')()).not.toThrow()
  })

  it('does not redirect when user is super-admin (bypass via can())', () => {
    setupState({ isAdmin: true, isSuperAdmin: true })
    expect(() => requirePermission('any.permission')()).not.toThrow()
  })

  it('redirects to /login when user is unauthenticated', () => {
    setupState({ isAuthenticated: false })
    expect(() => requirePermission('employees.view')()).toThrow('redirect:/login')
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
    expect(() => requireRole('super-admin')()).not.toThrow()
  })

  it('redirects to /unauthorized when user is admin but role requires super-admin', () => {
    setupState({ isAdmin: true, isSuperAdmin: false })
    expect(() => requireRole('super-admin')()).toThrow('redirect:/unauthorized')
  })

  it('redirects to /unauthorized when user has no roles and super-admin required', () => {
    setupState({ isAdmin: false, isSuperAdmin: false })
    expect(() => requireRole('super-admin')()).toThrow('redirect:/unauthorized')
  })

  it('does not redirect when user is admin and role is admin', () => {
    setupState({ isAdmin: true })
    expect(() => requireRole('admin')()).not.toThrow()
  })

  it('redirects to /unauthorized when user is not admin and role is admin', () => {
    setupState({ isAdmin: false })
    expect(() => requireRole('admin')()).toThrow('redirect:/unauthorized')
  })

  it('redirects to /login when unauthenticated', () => {
    setupState({ isAuthenticated: false })
    expect(() => requireRole('super-admin')()).toThrow('redirect:/login')
  })

  it('computes role from user object (not from stale isAdmin boolean)', () => {
    // Simulates the rehydration race condition fix:
    // even if isAdmin boolean were stale (false), checkIsAdmin(user) is called
    setupState({ isAdmin: true, isSuperAdmin: true })
    requireRole('super-admin')()
    // Verify checkIsSuperAdmin was called with the user object
    expect(mockCheckIsSuperAdmin).toHaveBeenCalledWith(expect.any(Object))
  })
})

// ─── requireDev ───────────────────────────────────────────────────────────────

describe('requireDev', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not redirect when running in dev', () => {
    vi.stubEnv('DEV', true)
    expect(() => requireDev()()).not.toThrow()
  })

  it('redirects to /unauthorized when not running in dev (production build)', () => {
    vi.stubEnv('DEV', false)
    expect(() => requireDev()()).toThrow('redirect:/unauthorized')
  })
})
