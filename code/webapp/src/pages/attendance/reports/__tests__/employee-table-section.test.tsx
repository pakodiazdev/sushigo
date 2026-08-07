/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EmployeeTableSection } from '../employee-table-section'
import type { TodayReportEmployee } from '@/types/report'

afterEach(() => {
  cleanup()
})

const baseEmployee: TodayReportEmployee = {
  employee_id: 'emp-001',
  name: 'Carlos Mendoza',
  code: 'EMP-001',
  role: 'cook',
  status: 'arrived',
  check_in_time: '2026-06-18T19:00:00Z',
  late_minutes: null,
  has_overtime: false,
  overtime_authorized: false,
}

describe('EmployeeTableSection', () => {
  it('renders the error state when isError is true', () => {
    render(<EmployeeTableSection isError={true} isLoading={false} employees={[]} />)
    expect(screen.getByText('Error al cargar')).toBeDefined()
  })

  it('renders the empty message when there are no employees and not loading', () => {
    render(<EmployeeTableSection isError={false} isLoading={false} employees={[]} />)
    expect(screen.getByText('No hay empleados activos en esta sucursal.')).toBeDefined()
  })

  it('renders through DataGrid with the expected column headers', () => {
    render(<EmployeeTableSection isError={false} isLoading={false} employees={[baseEmployee]} />)
    expect(screen.getByTestId('employee-table')).toBeDefined()
    expect(screen.getByText('Empleado')).toBeDefined()
    expect(screen.getByText('Puesto')).toBeDefined()
    expect(screen.getByText('Estado')).toBeDefined()
    expect(screen.getByText('Entrada')).toBeDefined()
    expect(screen.getByText('HE')).toBeDefined()
  })

  it('renders employee name, code and role', () => {
    render(<EmployeeTableSection isError={false} isLoading={false} employees={[baseEmployee]} />)
    expect(screen.getByText('Carlos Mendoza')).toBeDefined()
    expect(screen.getByText('EMP-001')).toBeDefined()
    expect(screen.getByText('cook')).toBeDefined()
  })

  it('shows a dash for role when null', () => {
    render(
      <EmployeeTableSection
        isError={false}
        isLoading={false}
        employees={[{ ...baseEmployee, role: null }]}
      />
    )
    const row = screen.getByText('Carlos Mendoza').closest('tr')!
    expect(row.textContent).toContain('—')
  })

  it('shows a dash for check-in time when null', () => {
    render(
      <EmployeeTableSection
        isError={false}
        isLoading={false}
        employees={[{ ...baseEmployee, check_in_time: null }]}
      />
    )
    const row = screen.getByText('Carlos Mendoza').closest('tr')!
    expect(row.textContent).toContain('—')
  })

  it('shows the authorized overtime flag icon', () => {
    render(
      <EmployeeTableSection
        isError={false}
        isLoading={false}
        employees={[{ ...baseEmployee, has_overtime: true, overtime_authorized: true }]}
      />
    )
    expect(screen.getByLabelText('Horas extra autorizadas')).toBeDefined()
  })

  it('shows the pending overtime flag icon', () => {
    render(
      <EmployeeTableSection
        isError={false}
        isLoading={false}
        employees={[{ ...baseEmployee, has_overtime: true, overtime_authorized: false }]}
      />
    )
    expect(screen.getByLabelText('Horas extra pendientes de decisión')).toBeDefined()
  })

  it('does not render an overtime flag icon when has_overtime is false', () => {
    render(<EmployeeTableSection isError={false} isLoading={false} employees={[baseEmployee]} />)
    expect(screen.queryByLabelText(/horas extra/i)).toBeNull()
  })

  it('renders one row per employee, keyed by employee_id', () => {
    const employees: TodayReportEmployee[] = [
      baseEmployee,
      { ...baseEmployee, employee_id: 'emp-002', name: 'María García', code: 'EMP-002' },
    ]
    render(<EmployeeTableSection isError={false} isLoading={false} employees={employees} />)
    expect(screen.getByText('Carlos Mendoza')).toBeDefined()
    expect(screen.getByText('María García')).toBeDefined()
  })

  it('renders per-column skeleton placeholders while loading, before the first employees arrive', () => {
    const { container } = render(
      <EmployeeTableSection isError={false} isLoading={true} employees={[]} />
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('No hay empleados activos en esta sucursal.')).toBeNull()
  })
})
