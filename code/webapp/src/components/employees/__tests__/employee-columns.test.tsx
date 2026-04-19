/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { getEmployeeColumns } from '../employee-columns'
import type { Employee } from '@/types/employee'

const mockEmployee: Employee = {
  id: 'emp-01',
  code: 'E001',
  user_id: 'user-01',
  first_name: 'Juan',
  last_name: 'Pérez',
  full_name: 'Juan Pérez',
  is_active: true,
  has_active_period: true,
  roles: ['manager', 'cook'],
  employment_periods: [
    {
      id: 'period-01',
      employee_id: 'emp-01',
      start_date: '2025-01-15',
      end_date: null,
      is_active: true,
      ended_by: null,
      reason: null,
      created_at: '2025-01-15T00:00:00+00:00',
      updated_at: '2025-01-15T00:00:00+00:00',
    },
  ],
  current_wages: null,
  created_at: '2025-01-15T00:00:00+00:00',
  updated_at: '2025-01-15T00:00:00+00:00',
}

describe('getEmployeeColumns', () => {
  const mockOnEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('returns 6 columns', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    expect(columns).toHaveLength(6)
  })

  it('has code column with correct key and header', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const codeColumn = columns.find((c) => c.key === 'code')

    expect(codeColumn).toBeDefined()
    expect(codeColumn?.header).toBe('Codigo')
    expect(codeColumn?.sortKey).toBe('code')
  })

  it('renders code column value', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const codeColumn = columns.find((c) => c.key === 'code')!

    render(<>{codeColumn.render(mockEmployee)}</>)
    expect(screen.getByText('E001')).toBeDefined()
  })

  it('renders name column with full name', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const nameColumn = columns.find((c) => c.key === 'name')!

    render(<>{nameColumn.render(mockEmployee)}</>)
    expect(screen.getByText('Juan Pérez')).toBeDefined()
  })

  it('renders roles column with badges', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const rolesColumn = columns.find((c) => c.key === 'roles')!

    render(<>{rolesColumn.render(mockEmployee)}</>)
    expect(screen.getByText('Gerente')).toBeDefined()
    expect(screen.getByText('Cocinero')).toBeDefined()
  })

  it('renders empty roles gracefully', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const rolesColumn = columns.find((c) => c.key === 'roles')!
    const empNoRoles = { ...mockEmployee, roles: [] }

    const { container } = render(<>{rolesColumn.render(empNoRoles)}</>)
    expect(container.querySelectorAll('span').length).toBe(0)
  })

  it('renders undefined roles gracefully', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const rolesColumn = columns.find((c) => c.key === 'roles')!
    const empNoRoles = { ...mockEmployee, roles: undefined as unknown as string[] }

    const { container } = render(<>{rolesColumn.render(empNoRoles)}</>)
    expect(container.querySelectorAll('span').length).toBe(0)
  })

  it('renders active status badge for active employee', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const statusColumn = columns.find((c) => c.key === 'is_active')!

    render(<>{statusColumn.render(mockEmployee)}</>)
    expect(screen.getByText('Activo')).toBeDefined()
  })

  it('renders inactive status badge for inactive employee', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const statusColumn = columns.find((c) => c.key === 'is_active')!
    const inactiveEmp = { ...mockEmployee, is_active: false, has_active_period: true }

    render(<>{statusColumn.render(inactiveEmp)}</>)
    expect(screen.getByText('Inactivo')).toBeDefined()
  })

  it('renders baja status badge for employee without active period', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const statusColumn = columns.find((c) => c.key === 'is_active')!
    const bajaEmp = { ...mockEmployee, has_active_period: false }

    render(<>{statusColumn.render(bajaEmp)}</>)
    expect(screen.getByText('Baja')).toBeDefined()
  })

  it('renders baja status when employment_periods has no active period', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const statusColumn = columns.find((c) => c.key === 'is_active')!
    const bajaEmp = {
      ...mockEmployee,
      has_active_period: undefined,
      employment_periods: [
        {
          id: 'period-01',
          employee_id: 'emp-01',
          start_date: '2025-01-15',
          end_date: '2025-06-30',
          is_active: false,
          ended_by: 'user-01',
          reason: 'Renuncia',
          created_at: '2025-01-15T00:00:00+00:00',
          updated_at: '2025-06-30T00:00:00+00:00',
        },
      ],
    }

    render(<>{statusColumn.render(bajaEmp)}</>)
    expect(screen.getByText('Baja')).toBeDefined()
  })

  it('renders created_at column with formatted date', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const dateColumn = columns.find((c) => c.key === 'created_at')!

    render(<>{dateColumn.render(mockEmployee)}</>)
    // The format is 'es-MX' with month 'short', so Jan 15, 2025 might be "15 ene 2025"
    expect(screen.getByText(/2025/)).toBeDefined()
  })

  it('calls onEdit when actions button is clicked', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const actionsColumn = columns.find((c) => c.key === 'actions')!

    render(<>{actionsColumn.render(mockEmployee)}</>)
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockOnEdit).toHaveBeenCalledWith(mockEmployee)
  })

  it('stops event propagation on actions button click', () => {
    const parentClickHandler = vi.fn()
    const columns = getEmployeeColumns(mockOnEdit)
    const actionsColumn = columns.find((c) => c.key === 'actions')!

    render(
      <div onClick={parentClickHandler}>
        {actionsColumn.render(mockEmployee)}
      </div>,
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockOnEdit).toHaveBeenCalled()
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('all columns have skeleton functions', () => {
    const columns = getEmployeeColumns(mockOnEdit)

    columns.forEach((column) => {
      expect(column.skeleton).toBeDefined()
      const { container } = render(<>{column.skeleton()}</>)
      expect(container.querySelector('.animate-pulse')).not.toBeNull()
    })
  })

  it('renders role with fallback color for unknown role', () => {
    const columns = getEmployeeColumns(mockOnEdit)
    const rolesColumn = columns.find((c) => c.key === 'roles')!
    const empUnknownRole = { ...mockEmployee, roles: ['unknown-role'] }

    render(<>{rolesColumn.render(empUnknownRole)}</>)
    const badge = screen.getByText('unknown-role')
    expect(badge.className).toContain('bg-gray-100')
  })
})
