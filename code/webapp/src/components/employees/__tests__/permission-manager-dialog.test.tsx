// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, act, cleanup } from '@testing-library/react'
import { PermissionManagerDialog } from '@/components/employees/permission-manager-dialog'
import type { PermissionGroup, PermissionSource } from '@/types/user-permissions'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={(type ?? 'button') as 'button' | 'submit' | 'reset'}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanelOverlayContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}))

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockGroups: PermissionGroup[] = [
  {
    group: 'Empleados',
    permissions: [
      { name: 'employees.view',   label: 'Ver empleados',   source: 'role',   via_roles: ['manager'] },
      { name: 'employees.create', label: 'Crear empleado',  source: 'none',   via_roles: [] },
      { name: 'employees.update', label: 'Editar empleado', source: 'direct', via_roles: [] },
    ],
  },
  {
    group: 'Cajas',
    permissions: [
      { name: 'cash.view', label: 'Ver cajas', source: 'none', via_roles: [] },
    ],
  },
]

const BASE_PROPS = {
  isOpen: true,
  onClose: vi.fn(),
  employeeName: 'Juan Pérez',
  groups: mockGroups,
  isLoading: false,
  isSaving: false,
  hasChanges: false,
  isChecked: (_name: string, source: PermissionSource) => source === 'role' || source === 'direct',
  togglePermission: vi.fn(),
  onSave: vi.fn(),
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PermissionManagerDialog', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // ── Visibility ───────────────────────────────────────────────────────────────

  it('renders nothing when isOpen is false', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} isOpen={false} />)
    expect(document.body.querySelector('dialog')).toBeNull()
  })

  it('renders the dialog when isOpen is true', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    expect(document.body.querySelector('dialog')).not.toBeNull()
  })

  // ── Header ───────────────────────────────────────────────────────────────────

  it('shows employee name in header', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    expect(document.body.textContent).toContain('Juan Pérez')
  })

  it('shows subtitle about role permissions', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    expect(document.body.textContent).toContain('Los permisos en gris son heredados del rol')
  })

  // ── Loading state ────────────────────────────────────────────────────────────

  it('shows spinner when isLoading is true', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} isLoading />)
    // Loader2 renders as an SVG — confirm no groups are visible
    expect(document.body.querySelector('svg')).not.toBeNull()
    expect(document.body.textContent).not.toContain('Empleados')
  })

  it('shows permission groups when not loading', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    expect(document.body.textContent).toContain('Empleados')
    expect(document.body.textContent).toContain('Cajas')
  })

  // ── Accordion ────────────────────────────────────────────────────────────────

  it('groups start collapsed — no permission labels visible', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    expect(document.body.textContent).not.toContain('Ver empleados')
  })

  it('clicking a group header expands it and shows permissions', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })
    expect(document.body.textContent).toContain('Ver empleados')
    expect(document.body.textContent).toContain('Crear empleado')
    expect(document.body.textContent).toContain('Editar empleado')
  })

  it('clicking an expanded group header collapses it', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })
    act(() => { fireEvent.click(groupBtn) })
    expect(document.body.textContent).not.toContain('Ver empleados')
  })

  // ── Permission rows ───────────────────────────────────────────────────────────

  it('role-source checkbox is disabled', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })

    const checkboxes = Array.from(
      document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    )
    // employees.view has source=role — its checkbox should be disabled
    const roleCheckbox = checkboxes[0]
    expect(roleCheckbox?.disabled).toBe(true)
  })

  it('direct-source and none-source checkboxes are enabled', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })

    const checkboxes = Array.from(
      document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    )
    // employees.create (none) and employees.update (direct) should be enabled
    expect(checkboxes[1]?.disabled).toBe(false)
    expect(checkboxes[2]?.disabled).toBe(false)
  })

  it('shows via_roles badge for role-source permissions', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} />)
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })
    expect(document.body.textContent).toContain('manager')
  })

  it('toggling an enabled checkbox calls togglePermission', () => {
    const togglePermission = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} togglePermission={togglePermission} />)
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })

    const checkboxes = Array.from(
      document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    )
    // employees.create is at index 1 (none source — enabled)
    act(() => { fireEvent.click(checkboxes[1]!) })
    expect(togglePermission).toHaveBeenCalledWith('employees.create', 'none')
  })

  // ── Footer buttons ────────────────────────────────────────────────────────────

  it('Save button is disabled when hasChanges is false', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} hasChanges={false} />)
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Guardar'),
    )!
    expect(saveBtn.disabled).toBe(true)
  })

  it('Save button is enabled when hasChanges is true', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} hasChanges />)
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Guardar'),
    )!
    expect(saveBtn.disabled).toBe(false)
  })

  it('Save button is disabled when isSaving is true', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} hasChanges isSaving />)
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Guardar'),
    )!
    expect(saveBtn.disabled).toBe(true)
  })

  it('clicking Save calls onSave', () => {
    const onSave = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} hasChanges onSave={onSave} />)
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Guardar'),
    )!
    fireEvent.click(saveBtn)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('clicking Cancelar calls onClose', () => {
    const onClose = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} onClose={onClose} />)
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancelar',
    )!
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Cancelar button is disabled when isSaving is true', () => {
    render(<PermissionManagerDialog {...BASE_PROPS} isSaving />)
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancelar',
    )!
    expect(cancelBtn.disabled).toBe(true)
  })

  // ── Backdrop ──────────────────────────────────────────────────────────────────

  it('clicking backdrop calls onClose when not saving', () => {
    const onClose = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} onClose={onClose} />)
    const backdrop = document.body.querySelector('button[aria-label="Cerrar diálogo"]')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking backdrop does nothing when isSaving is true', () => {
    const onClose = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} onClose={onClose} isSaving />)
    const backdrop = document.body.querySelector('button[aria-label="Cerrar diálogo"]')!
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()
  })

  // ── Escape key ────────────────────────────────────────────────────────────────

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} onClose={onClose} />)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pressing Escape does nothing when isSaving is true', () => {
    const onClose = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} onClose={onClose} isSaving />)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('pressing a non-Escape key does not call onClose', () => {
    const onClose = vi.fn()
    render(<PermissionManagerDialog {...BASE_PROPS} onClose={onClose} />)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  // ── Accordion reset on re-open ────────────────────────────────────────────────

  it('resets expanded groups when dialog re-opens', () => {
    const { rerender } = render(<PermissionManagerDialog {...BASE_PROPS} />)
    // expand a group
    const groupBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Empleados'),
    )!
    act(() => { fireEvent.click(groupBtn) })
    expect(document.body.textContent).toContain('Ver empleados')

    // close then re-open
    rerender(<PermissionManagerDialog {...BASE_PROPS} isOpen={false} />)
    rerender(<PermissionManagerDialog {...BASE_PROPS} isOpen />)
    expect(document.body.textContent).not.toContain('Ver empleados')
  })
})
