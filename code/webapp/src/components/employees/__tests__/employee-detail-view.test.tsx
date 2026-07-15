// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { EmployeeDetailView } from '@/components/employees/employee-detail-view'
import type { Employee } from '@/types/employee'

const openDialog = vi.fn()

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, className }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: string
    className?: string
  }) => (
    <button type={(type ?? 'button') as 'button' | 'submit' | 'reset'} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/components/employees/employment-periods-section', () => ({
  EmploymentPeriodsSection: () => <div>EmploymentPeriodsSection</div>,
}))

vi.mock('@/components/employees/wage-history-section', () => ({
  WageHistorySection: () => <div>WageHistorySection</div>,
}))

vi.mock('@/components/employees/employee-info-header', () => ({
  EmployeeInfoHeader: ({ employee }: { employee: Employee }) => <div>{employee.first_name} {employee.last_name}</div>,
}))

vi.mock('@/components/employees/deactivate-form', () => ({
  DeactivateForm: () => <div>DeactivateForm</div>,
}))

vi.mock('@/components/employees/rehire-form', () => ({
  RehireForm: () => <div>RehireForm</div>,
}))

vi.mock('@/components/employees/schedule-section', () => ({
  ScheduleSection: () => <div>ScheduleSection</div>,
}))

vi.mock('@/components/employees/leave-summary-section', () => ({
  LeaveSummarySection: () => <div>LeaveSummarySection</div>,
}))

vi.mock('@/components/employees/extra-day-section', () => ({
  ExtraDaySection: () => <div>ExtraDaySection</div>,
}))

vi.mock('@/components/employees/permission-manager-dialog', () => ({
  PermissionManagerDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>PermissionManagerDialog</div> : null,
}))

vi.mock('@/components/employees/bonus-config-section', () => ({
  BonusConfigSection: () => <div>BonusConfigSection</div>,
}))

vi.mock('@/components/employees/vacation-section', () => ({
  VacationSection: () => <div>VacationSection</div>,
}))

vi.mock('@/components/employees/overtime-bank-section', () => ({
  OvertimeBankSection: () => <div>OvertimeBankSection</div>,
}))

vi.mock('@/components/employees/use-employee-detail-actions', () => ({
  useEmployeeDetailActions: () => ({
    hasActivePeriod: true,
    isLoading: false,
    showDeactivateForm: false,
    showRehireForm: false,
    showToggleConfirm: false,
    handleDeactivateSubmit: vi.fn(),
    handleRehireSubmit: vi.fn(),
    handleToggleActive: vi.fn(),
    openDeactivateForm: vi.fn(),
    openRehireForm: vi.fn(),
    closeDeactivateForm: vi.fn(),
    closeRehireForm: vi.fn(),
    openToggleConfirm: vi.fn(),
    closeToggleConfirm: vi.fn(),
  }),
}))

vi.mock('@/components/employees/use-permission-manager', () => ({
  usePermissionManager: () => ({
    open: false,
    openDialog,
    closeDialog: vi.fn(),
    groups: [],
    isLoading: false,
    isSaving: false,
    hasChanges: false,
    isChecked: vi.fn(),
    togglePermission: vi.fn(),
    save: vi.fn(),
  }),
}))

let canManagePermissions = true

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { can: (permission: string) => boolean }) => unknown) =>
    selector({
      can: (permission: string) => canManagePermissions && (permission === 'users.update' || permission === 'users.show'),
    }),
}))

const employee = {
  id: 12,
  code: 'EMP-012',
  first_name: 'Laura',
  last_name: 'Torres',
  email: 'laura@sushigo.com',
  phone: '5512345678',
  is_active: true,
  has_user: true,
  employment_periods: [],
  roles: [],
} as unknown as Employee

const baseProps = {
  employee,
  onEdit: vi.fn(),
  onDeactivate: vi.fn(),
  onRehire: vi.fn(),
  onToggleActive: vi.fn(),
  isDeactivating: false,
  isRehiring: false,
  isTogglingActive: false,
}

describe('EmployeeDetailView', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    canManagePermissions = true
  })

  it('renders the permission manager entry point when the employee has a linked user and the viewer can manage permissions', () => {
    render(<EmployeeDetailView {...baseProps} />)

    expect(screen.getByText('Permisos directos del usuario')).toBeTruthy()
    expect(screen.getByText('Gestionar →')).toBeTruthy()
  })

  it('opens the permission manager dialog from the detail view action', () => {
    render(<EmployeeDetailView {...baseProps} />)

    fireEvent.click(screen.getByText('Gestionar →'))

    expect(openDialog).toHaveBeenCalledTimes(1)
  })

  it('hides the permission manager entry point when the employee has no linked user', () => {
    render(<EmployeeDetailView {...baseProps} employee={{ ...employee, has_user: false } as Employee} />)

    expect(screen.queryByText('Permisos directos del usuario')).toBeNull()
    expect(screen.queryByText('Gestionar →')).toBeNull()
  })

  it('hides the permission manager entry point when the viewer lacks one of the required permissions', () => {
    canManagePermissions = false

    render(<EmployeeDetailView {...baseProps} />)

    expect(screen.queryByText('Permisos directos del usuario')).toBeNull()
    expect(screen.queryByText('Gestionar →')).toBeNull()
  })

  it('renders the Habilitar toggle button when the employee is inactive', () => {
    render(<EmployeeDetailView {...baseProps} employee={{ ...employee, is_active: false } as Employee} />)

    expect(screen.getByText('Habilitar')).toBeTruthy()
    expect(screen.queryByText('Deshabilitar')).toBeNull()
  })
})