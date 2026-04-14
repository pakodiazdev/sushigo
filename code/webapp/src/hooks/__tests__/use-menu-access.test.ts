// @vitest-environment jsdom
/**
 * useMenuAccess hook tests
 *
 * Validates that resolveAccess() returns the correct access result
 * ('show' | 'disabled' | 'hidden') for different user roles and permissions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMenuAccess } from '@/hooks/use-menu-access'

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

function resolve(item: Parameters<ReturnType<typeof useMenuAccess>['resolveAccess']>[0]) {
  const { result } = renderHook(() => useMenuAccess())
  return result.current.resolveAccess(item)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setupUser()
})

describe('useMenuAccess — items with no restrictions', () => {
  it('always shows Dashboard (no requiredPermission, no requiredRole)', () => {
    setupUser()
    expect(resolve({ icon: {} as never, label: 'Dashboard' })).toBe('show')
  })

  it('always shows Dashboard for any user including unauthenticated', () => {
    expect(resolve({})).toBe('show')
  })
})

describe('useMenuAccess — admin user sees everything', () => {
  beforeEach(() => setupUser({ isAdmin: true }))

  it('shows items requiring employees.view permission', () => {
    expect(resolve({ requiredPermission: 'employees.view' })).toBe('show')
  })

  it('shows items requiring items.view permission', () => {
    expect(resolve({ requiredPermission: 'items.view' })).toBe('show')
  })

  it('shows items requiring cash_registers.view permission', () => {
    expect(resolve({ requiredPermission: 'cash_registers.view' })).toBe('show')
  })

  it('shows items requiring super-admin role (admin role check)', () => {
    // admin does NOT satisfy super-admin role requirement
    expect(resolve({ requiredRole: 'super-admin' })).toBe('hidden')
  })

  it('shows items requiring admin role', () => {
    expect(resolve({ requiredRole: 'admin' })).toBe('show')
  })
})

describe('useMenuAccess — super-admin user sees everything', () => {
  beforeEach(() => setupUser({ isAdmin: true, isSuperAdmin: true }))

  it('shows Configuración (requiredRole: super-admin)', () => {
    expect(resolve({ requiredRole: 'super-admin' })).toBe('show')
  })

  it('shows items requiring any permission', () => {
    expect(resolve({ requiredPermission: 'employees.view' })).toBe('show')
    expect(resolve({ requiredPermission: 'stock.view' })).toBe('show')
  })
})

describe('useMenuAccess — inventory-manager sees only inventory sections', () => {
  beforeEach(() => setupUser({ permissions: ['items.view', 'stock.view', 'inventory_locations.view', 'stock.manage'] }))

  it('shows Inventario section (items.view)', () => {
    expect(resolve({ requiredPermission: 'items.view' })).toBe('show')
  })

  it('shows Stock Dashboard (stock.view)', () => {
    expect(resolve({ requiredPermission: 'stock.view' })).toBe('show')
  })

  it('hides Empleados section (employees.view) — mode: hidden', () => {
    expect(resolve({ requiredPermission: 'employees.view', accessMode: 'hidden' })).toBe('hidden')
  })

  it('hides Configuración (requiredRole: super-admin)', () => {
    expect(resolve({ requiredRole: 'super-admin', accessMode: 'hidden' })).toBe('hidden')
  })

  it('hides Caja section (cash_registers.view)', () => {
    expect(resolve({ requiredPermission: 'cash_registers.view', accessMode: 'hidden' })).toBe('hidden')
  })
})

describe('useMenuAccess — manager user sees Empleados & Asistencia, not Inventario', () => {
  beforeEach(() => setupUser({ permissions: ['employees.view', 'employees.create'] }))

  it('shows Empleados (employees.view)', () => {
    expect(resolve({ requiredPermission: 'employees.view' })).toBe('show')
  })

  it('shows Asistencia (employees.view)', () => {
    expect(resolve({ requiredPermission: 'employees.view' })).toBe('show')
  })

  it('hides Inventario (items.view)', () => {
    expect(resolve({ requiredPermission: 'items.view', accessMode: 'hidden' })).toBe('hidden')
  })

  it('hides Stock Dashboard (stock.view)', () => {
    expect(resolve({ requiredPermission: 'stock.view', accessMode: 'hidden' })).toBe('hidden')
  })
})

describe('useMenuAccess — unknown role sees only always-visible sections', () => {
  beforeEach(() => setupUser({ permissions: [] }))

  it('shows Dashboard (no restriction)', () => {
    expect(resolve({})).toBe('show')
  })

  it('hides Empleados', () => {
    expect(resolve({ requiredPermission: 'employees.view', accessMode: 'hidden' })).toBe('hidden')
  })

  it('hides Inventario', () => {
    expect(resolve({ requiredPermission: 'items.view', accessMode: 'hidden' })).toBe('hidden')
  })

  it('hides Caja', () => {
    expect(resolve({ requiredPermission: 'cash_registers.view', accessMode: 'hidden' })).toBe('hidden')
  })

  it('hides Configuración', () => {
    expect(resolve({ requiredRole: 'super-admin', accessMode: 'hidden' })).toBe('hidden')
  })
})

describe('useMenuAccess — disabled mode', () => {
  beforeEach(() => setupUser({ permissions: [] }))

  it('returns disabled (not hidden) when accessMode is disabled and no permission', () => {
    expect(resolve({ requiredPermission: 'employees.view', accessMode: 'disabled' })).toBe('disabled')
  })

  it('returns disabled for role restriction when accessMode is disabled', () => {
    expect(resolve({ requiredRole: 'super-admin', accessMode: 'disabled' })).toBe('disabled')
  })
})

describe('useMenuAccess — default accessMode is hidden', () => {
  it('defaults to hidden when accessMode is not specified', () => {
    setupUser({ permissions: [] })
    expect(resolve({ requiredPermission: 'employees.view' })).toBe('hidden')
  })
})
