// @vitest-environment jsdom
/**
 * CanAccess component tests
 *
 * Validates that children are shown, hidden, or disabled based on
 * the user's permissions and roles.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { CanAccess } from '@/components/auth/CanAccess'

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  setupUser()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CanAccess — hidden mode (default)', () => {
  it('renders children when user has the required permission', () => {
    setupUser({ permissions: ['employees.create'] })
    render(
      <CanAccess permission="employees.create">
        <button>Agregar empleado</button>
      </CanAccess>,
    )
    expect(screen.getByText('Agregar empleado')).toBeDefined()
  })

  it('renders nothing when user lacks the required permission', () => {
    setupUser({ permissions: [] })
    render(
      <CanAccess permission="employees.create">
        <button>Agregar empleado</button>
      </CanAccess>,
    )
    expect(screen.queryByText('Agregar empleado')).toBeNull()
  })

  it('renders children when no permission or role specified', () => {
    render(
      <CanAccess>
        <span>Visible siempre</span>
      </CanAccess>,
    )
    expect(screen.getByText('Visible siempre')).toBeDefined()
  })

  it('renders fallback when provided and access is denied', () => {
    setupUser({ permissions: [] })
    render(
      <CanAccess permission="employees.create" fallback={<span>Sin permiso</span>}>
        <button>Agregar empleado</button>
      </CanAccess>,
    )
    expect(screen.queryByText('Agregar empleado')).toBeNull()
    expect(screen.getByText('Sin permiso')).toBeDefined()
  })

  it('renders nothing (no fallback) when access is denied and no fallback provided', () => {
    setupUser({ permissions: [] })
    const { container } = render(
      <CanAccess permission="employees.create">
        <button>Hidden</button>
      </CanAccess>,
    )
    expect(container.textContent).toBe('')
  })
})

describe('CanAccess — disabled mode', () => {
  it('renders a disabled wrapper when user lacks permission', () => {
    setupUser({ permissions: [] })
    render(
      <CanAccess permission="leaves.approve" mode="disabled">
        <button>Aprobar permiso</button>
      </CanAccess>,
    )
    // Children are still visible but wrapped in a disabled span
    const button = screen.getByText('Aprobar permiso')
    expect(button).toBeDefined()
    const wrapper = button.closest('[aria-disabled="true"]')
    expect(wrapper).toBeDefined()
    expect(wrapper?.getAttribute('title')).toBe('Sin acceso')
  })

  it('renders children normally (no disabled wrapper) when user has permission', () => {
    setupUser({ permissions: ['leaves.approve'] })
    render(
      <CanAccess permission="leaves.approve" mode="disabled">
        <button>Aprobar permiso</button>
      </CanAccess>,
    )
    const button = screen.getByText('Aprobar permiso')
    expect(button).toBeDefined()
    expect(button.closest('[aria-disabled="true"]')).toBeNull()
  })
})

describe('CanAccess — role checks', () => {
  it('renders children when user has super-admin role', () => {
    setupUser({ isAdmin: true, isSuperAdmin: true })
    render(
      <CanAccess role="super-admin">
        <div>Panel de admin</div>
      </CanAccess>,
    )
    expect(screen.getByText('Panel de admin')).toBeDefined()
  })

  it('hides children when user is not super-admin', () => {
    setupUser({ isAdmin: true, isSuperAdmin: false })
    render(
      <CanAccess role="super-admin">
        <div>Panel de admin</div>
      </CanAccess>,
    )
    expect(screen.queryByText('Panel de admin')).toBeNull()
  })

  it('renders children for admin role when user is admin', () => {
    setupUser({ isAdmin: true })
    render(
      <CanAccess role="admin">
        <div>Admin section</div>
      </CanAccess>,
    )
    expect(screen.getByText('Admin section')).toBeDefined()
  })
})

describe('CanAccess — admin bypass', () => {
  it('renders children for admin even without explicit permission', () => {
    setupUser({ isAdmin: true, permissions: [] })
    render(
      <CanAccess permission="employees.create">
        <button>Acción de admin</button>
      </CanAccess>,
    )
    expect(screen.getByText('Acción de admin')).toBeDefined()
  })
})
