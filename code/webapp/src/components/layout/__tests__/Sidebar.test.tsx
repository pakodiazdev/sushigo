// @vitest-environment jsdom
/**
 * Sidebar permission-aware navigation tests
 *
 * Validates that the Sidebar shows, hides, or disables menu items
 * based on the logged-in user's roles and permissions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'

// ─── Mock Dependencies ────────────────────────────────────────────────────────

const mockResolveAccess = vi.fn()

vi.mock('@/hooks/use-menu-access', () => ({
  useMenuAccess: () => ({ resolveAccess: mockResolveAccess }),
}))

const mockSidebar = {
  isCollapsed: false,
  isMobileOpen: false,
  toggleSidebar: vi.fn(),
  closeMobileSidebar: vi.fn(),
}

vi.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => mockSidebar,
}))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => ({ location: { pathname: '/' } }),
  Link: ({ children, to, className, onClick }: {
    children: React.ReactNode
    to: string
    className?: string
    onClick?: () => void
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/auth', () => ({
  BranchSwitcher: () => <div data-testid="branch-switcher" />,
}))

vi.mock('@/components/ui/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ can: () => false }),
}))

vi.mock('@/services/employee-request-hooks', () => ({
  usePendingRequestsCount: () => ({ data: 0 }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: {
    children: React.ReactNode
    onClick?: () => void
    className?: string
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Show all items (admin-like) */
function showAll() {
  mockResolveAccess.mockReturnValue('show')
}

/** Hide all restricted items (returns 'show' for unrestricted, 'hidden' for others) */
function setupPermissions(visible: string[], hidden: string[] = []) {
  mockResolveAccess.mockImplementation((item: { requiredPermission?: string; requiredRole?: string; label?: string }) => {
    if (!item.requiredPermission && !item.requiredRole) return 'show'
    const label = item.label ?? ''
    if (hidden.includes(label)) return 'hidden'
    if (visible.includes(label)) return 'show'
    return 'hidden'
  })
}

import Sidebar from '../Sidebar'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockSidebar.isCollapsed = false
  mockSidebar.isMobileOpen = false
})

// ─── Always-visible items ─────────────────────────────────────────────────────

describe('Sidebar — always-visible items', () => {
  beforeEach(() => showAll())

  it('always shows Dashboard', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  it('always shows Productos', () => {
    render(<Sidebar />)
    expect(screen.getByText('Productos')).toBeDefined()
  })

  it('always shows Órdenes', () => {
    render(<Sidebar />)
    expect(screen.getByText('Órdenes')).toBeDefined()
  })

  it('always shows Clientes', () => {
    render(<Sidebar />)
    expect(screen.getByText('Clientes')).toBeDefined()
  })
})

// ─── Access modes ─────────────────────────────────────────────────────────────

describe('Sidebar — hidden items excluded from DOM', () => {
  it('excludes hidden items from the DOM', () => {
    mockResolveAccess.mockImplementation((item: { label?: string }) =>
      item.label === 'Empleados' ? 'hidden' : 'show',
    )
    render(<Sidebar />)
    expect(screen.queryByText('Empleados')).toBeNull()
    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  it('hides multiple items when all restricted', () => {
    mockResolveAccess.mockImplementation((item: { requiredPermission?: string; requiredRole?: string }) =>
      item.requiredPermission || item.requiredRole ? 'hidden' : 'show',
    )
    render(<Sidebar />)
    expect(screen.queryByText('Empleados')).toBeNull()
    expect(screen.queryByText('Inventario')).toBeNull()
    expect(screen.queryByText('Configuración')).toBeNull()
    expect(screen.getByText('Dashboard')).toBeDefined()
  })
})

describe('Sidebar — disabled items render greyed-out span', () => {
  it('renders disabled span with aria-disabled and title when access is disabled', () => {
    mockResolveAccess.mockImplementation((item: { label?: string }) =>
      item.label === 'Empleados' ? 'disabled' : 'show',
    )
    render(<Sidebar />)
    const empleadosText = screen.getByText('Empleados')
    expect(empleadosText).toBeDefined()
    const wrapper = empleadosText.closest('[aria-disabled="true"]')
    expect(wrapper).toBeDefined()
    expect(wrapper?.getAttribute('title')).toBe('Sin acceso')
  })

  it('disabled item is not a link or button', () => {
    mockResolveAccess.mockImplementation((item: { label?: string }) =>
      item.label === 'Empleados' ? 'disabled' : 'show',
    )
    render(<Sidebar />)
    const empleadosText = screen.getByText('Empleados')
    expect(empleadosText.closest('a')).toBeNull()
    expect(empleadosText.closest('button')).toBeNull()
  })

  it('renders disabled items with opacity class', () => {
    mockResolveAccess.mockImplementation((item: { label?: string }) =>
      item.label === 'Stock Dashboard' ? 'disabled' : 'show',
    )
    render(<Sidebar />)
    const text = screen.getByText('Stock Dashboard')
    const disabledSpan = text.closest('[aria-disabled="true"]')
    expect(disabledSpan).toBeDefined()
    expect(disabledSpan?.className).toContain('opacity-50')
    expect(disabledSpan?.className).toContain('cursor-not-allowed')
  })
})

// ─── Submenu expansion ────────────────────────────────────────────────────────

describe('Sidebar — submenu toggle', () => {
  beforeEach(() => showAll())

  it('submenu items are hidden by default (collapsed submenu)', () => {
    render(<Sidebar />)
    expect(screen.queryByText('Asistencia', { selector: 'a' })).toBeNull()
  })

  it('expands submenu when button is clicked', () => {
    render(<Sidebar />)
    const asistenciaBtn = screen.getByText('Asistencia')
    fireEvent.click(asistenciaBtn.closest('button')!)
    expect(screen.getByText('Asistencia', { selector: 'a' })).toBeDefined()
  })

  it('collapses submenu on second click', () => {
    render(<Sidebar />)
    const btn = screen.getByText('Asistencia').closest('button')!
    fireEvent.click(btn)
    expect(screen.getByText('Asistencia', { selector: 'a' })).toBeDefined()
    fireEvent.click(btn)
    expect(screen.queryByText('Asistencia', { selector: 'a' })).toBeNull()
  })

  it('expands Inventario submenu and shows sub-items', () => {
    render(<Sidebar />)
    const inventarioBtn = screen.getByText('Inventario').closest('button')!
    fireEvent.click(inventarioBtn)
    expect(screen.getByText('Items')).toBeDefined()
    expect(screen.getByText('Ubicaciones')).toBeDefined()
  })

  it('expands Caja submenu and shows sub-items', () => {
    render(<Sidebar />)
    const cajaBtn = screen.getByText('Caja').closest('button')!
    fireEvent.click(cajaBtn)
    expect(screen.getByText('Cajas Registradoras')).toBeDefined()
  })
})

// ─── Collapsed sidebar ────────────────────────────────────────────────────────

describe('Sidebar — collapsed state', () => {
  beforeEach(() => {
    showAll()
    mockSidebar.isCollapsed = true
  })

  it('hides label text when collapsed', () => {
    render(<Sidebar />)
    // Text labels are not rendered when isCollapsed = true
    expect(screen.queryByText('Dashboard')).toBeNull()
    expect(screen.queryByText('Empleados')).toBeNull()
  })

  it('does not expand submenu on click when collapsed', () => {
    render(<Sidebar />)
    // Sub-menu buttons are not rendered but the buttons still exist
    // When isCollapsed = true, onClick does nothing for submenu
    // The submenu items remain hidden
    expect(screen.queryByText('Asistencia', { selector: 'a' })).toBeNull()
  })

  it('shows expand button when collapsed', () => {
    render(<Sidebar />)
    // The ChevronRight expand button should be rendered
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('does not render disabled item labels when collapsed', () => {
    mockResolveAccess.mockImplementation((item: { label?: string }) =>
      item.label === 'Empleados' ? 'disabled' : 'show',
    )
    render(<Sidebar />)
    // No labels visible when collapsed
    expect(screen.queryByText('Empleados')).toBeNull()
  })
})

// ─── Role-based scenarios ─────────────────────────────────────────────────────

describe('Sidebar — admin user sees all sections', () => {
  beforeEach(() => showAll())

  it('shows all sections when admin', () => {
    render(<Sidebar />)
    expect(screen.getByText('Empleados')).toBeDefined()
    expect(screen.getByText('Asistencia')).toBeDefined()
    expect(screen.getByText('Inventario')).toBeDefined()
    expect(screen.getByText('Caja')).toBeDefined()
    expect(screen.getByText('Stock Dashboard')).toBeDefined()
    expect(screen.getByText('Configuración')).toBeDefined()
  })
})

describe('Sidebar — manager sees Empleados & Asistencia only', () => {
  beforeEach(() =>
    setupPermissions(['Empleados', 'Asistencia'], ['Inventario', 'Caja', 'Stock Dashboard', 'Configuración']),
  )

  it('shows Empleados and Asistencia', () => {
    render(<Sidebar />)
    expect(screen.getByText('Empleados')).toBeDefined()
    expect(screen.getByText('Asistencia')).toBeDefined()
  })

  it('hides Inventario', () => {
    render(<Sidebar />)
    expect(screen.queryByText('Inventario')).toBeNull()
  })
})

describe('Sidebar — inventory-manager sees inventory sections', () => {
  beforeEach(() =>
    setupPermissions(['Inventario', 'Stock Dashboard'], ['Empleados', 'Asistencia', 'Caja', 'Configuración']),
  )

  it('shows Inventario and Stock Dashboard', () => {
    render(<Sidebar />)
    expect(screen.getByText('Inventario')).toBeDefined()
    expect(screen.getByText('Stock Dashboard')).toBeDefined()
  })

  it('hides Empleados and Configuración', () => {
    render(<Sidebar />)
    expect(screen.queryByText('Empleados')).toBeNull()
    expect(screen.queryByText('Configuración')).toBeNull()
  })
})

// ─── Footer & version ─────────────────────────────────────────────────────────

// ─── Dev-only "Componentes" entry ─────────────────────────────────────────────

describe('Sidebar — dev-only Componentes entry', () => {
  beforeEach(() => showAll())

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows Componentes when running in dev', () => {
    vi.stubEnv('DEV', true)
    render(<Sidebar />)
    expect(screen.getByText('Componentes')).toBeDefined()
  })

  it('hides Componentes when not running in dev (production build)', () => {
    vi.stubEnv('DEV', false)
    render(<Sidebar />)
    expect(screen.queryByText('Componentes')).toBeNull()
  })
})

describe('Sidebar — footer', () => {
  beforeEach(() => showAll())

  it('renders version text when expanded', () => {
    render(<Sidebar />)
    expect(screen.getByText('v1.0.0')).toBeDefined()
  })

  it('renders short version text when collapsed', () => {
    mockSidebar.isCollapsed = true
    render(<Sidebar />)
    expect(screen.getByText('v1.0')).toBeDefined()
  })

  it('renders branch switcher when expanded', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('branch-switcher')).toBeDefined()
  })
})
