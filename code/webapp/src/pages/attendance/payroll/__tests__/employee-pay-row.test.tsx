// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { EmployeePayRow } from '../-employee-pay-row'
import type { PayPeriodEmployeePreview } from '@/types/attendance-payroll'

afterEach(() => {
  cleanup()
})

function buildRow(overrides: Partial<PayPeriodEmployeePreview> = {}): PayPeriodEmployeePreview {
  return {
    employee: { id: 'EMP-001', first_name: 'Ana', last_name: 'Payroll', code: 'EMP-001' },
    base_pay: 1900,
    late_deductions: 50,
    unpaid_leave_deductions: 0,
    overtime_pay: 150,
    extra_day_pay: 0,
    punctuality_bonus: 0,
    holiday_pay: 0,
    other_adjustments: 0,
    total_pay: 2000,
    free_hours_earned: 0,
    pay_period_lines: [
      { date: '2026-06-23', concept: 'BASE_PAY', description: 'Salario base', amount: 1900, minutes: null },
      { date: '2026-06-24', concept: 'LATE_DEDUCTION', description: 'Retardo', amount: -50, minutes: 15 },
      { date: '2026-06-25', concept: 'OVERTIME', description: 'Hora extra', amount: 150, minutes: 60 },
    ],
    ...overrides,
  }
}

describe('EmployeePayRow', () => {
  it('renders the employee name, base pay, deductions, extras, and total collapsed by default', () => {
    const { container } = render(<EmployeePayRow row={buildRow()} testId="employee-detail-row" />)

    expect(screen.getByText('Ana Payroll')).toBeDefined()
    expect(screen.getByRole('img', { name: 'Ana Payroll' })).toBeDefined()
    expect(screen.getByText(/Base:/)).toBeDefined()
    expect(container.textContent).toContain('−$50.00')
    expect(container.textContent).toContain('+$150.00')
    expect(container.textContent).toContain('Total: $2000.00')

    const toggle = screen.getByRole('button', { expanded: false })
    expect(toggle).toBeDefined()
    expect(screen.queryByText('BASE_PAY')).toBeNull()
  })

  it('expands to show the sorted line-item breakdown when clicked', () => {
    render(<EmployeePayRow row={buildRow()} testId="employee-detail-row" />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button', { expanded: true })).toBeDefined()
    expect(screen.getByText('BASE_PAY')).toBeDefined()
    expect(screen.getByText('LATE_DEDUCTION')).toBeDefined()
    expect(screen.getByText('OVERTIME')).toBeDefined()
    expect(screen.getByText('Salario base')).toBeDefined()
  })

  it('omits the deductions/extras chips when their totals are zero', () => {
    const row = buildRow({ late_deductions: 0, unpaid_leave_deductions: 0, overtime_pay: 0 })
    const { container } = render(<EmployeePayRow row={row} testId="employee-detail-row" />)

    expect(container.textContent).not.toContain('−$')
    expect(container.textContent).not.toContain('+$')
  })
})
