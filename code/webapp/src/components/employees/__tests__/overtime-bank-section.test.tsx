// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { OvertimeBankMovement, OvertimeBankSummary } from '@/types/attendance-payroll'

let mockState = {
  movements: [] as OvertimeBankMovement[],
  summary: null as OvertimeBankSummary | null,
  isLoading: false,
  showManualMovementDialog: false,
  manualMovementEmployee: null,
  openManualMovementDialog: vi.fn(),
  closeManualMovementDialog: vi.fn(),
}

vi.mock('@/components/employees/use-overtime-bank-section', () => ({
  useOvertimeBankSection: () => mockState,
}))

vi.mock('@/components/employees/ManualOvertimeMovementDialog', () => ({
  ManualOvertimeMovementDialog: () => null,
}))

const mockCan = vi.fn().mockReturnValue(true)

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ can: mockCan }),
}))

import { OvertimeBankSection } from '@/components/employees/overtime-bank-section'

beforeEach(() => {
  vi.clearAllMocks()
  mockCan.mockReturnValue(true)
  mockState = {
    movements: [],
    summary: null,
    isLoading: false,
    showManualMovementDialog: false,
    manualMovementEmployee: null,
    openManualMovementDialog: vi.fn(),
    closeManualMovementDialog: vi.fn(),
  }
})

afterEach(() => {
  cleanup()
})

describe('OvertimeBankSection', () => {
  it('renders the section header', () => {
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.getByText('Banco de horas extra')).toBeTruthy()
  })

  it('shows loading spinner when isLoading is true', () => {
    mockState = { ...mockState, isLoading: true }
    const { container } = render(<OvertimeBankSection employeeId="emp-001" />)

    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows empty state when there are no movements', () => {
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.getByText('Sin movimientos de horas extra registrados')).toBeTruthy()
  })

  it('renders the balance card with formatted balance', () => {
    mockState = { ...mockState, summary: { balance_minutes: 90, balance_formatted: '1:30' } }
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.getByText('1:30')).toBeTruthy()
    expect(screen.getByText('Saldo actual (90 min)')).toBeTruthy()
  })

  it('applies destructive class when balance is negative', () => {
    mockState = { ...mockState, summary: { balance_minutes: -30, balance_formatted: '-0:30' } }
    const { container } = render(<OvertimeBankSection employeeId="emp-001" />)

    expect(container.querySelector('.text-destructive')).toBeTruthy()
  })

  it('renders movements table with type, origin, and authorized_by', () => {
    mockState = {
      ...mockState,
      movements: [
        {
          id: 'mov-1',
          date: '2026-06-10',
          movement_type: 'EARNED',
          origin: 'AUTO',
          minutes: 60,
          valuation_method: null,
          applied_rate: null,
          amount: null,
          authorized_by: null,
          authorized_at: null,
          reason: null,
        },
        {
          id: 'mov-2',
          date: '2026-06-14',
          movement_type: 'PAID',
          origin: 'AUTO',
          minutes: 60,
          valuation_method: 'AGREED_RATE',
          applied_rate: 90,
          amount: 90,
          authorized_by: 'Jane Manager',
          authorized_at: '2026-06-14T20:00:00+00:00',
          reason: null,
        },
      ],
    }
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.getByText('Ganado')).toBeTruthy()
    expect(screen.getByText('Pagado')).toBeTruthy()
    expect(screen.getAllByText('Automático')).toHaveLength(2)
    expect(screen.getByText('Jane Manager')).toBeTruthy()
    expect(screen.getByText('$90.00')).toBeTruthy()
  })

  it('distinguishes MANUAL movements from AUTO ones', () => {
    mockState = {
      ...mockState,
      movements: [
        {
          id: 'mov-1',
          date: '2026-06-10',
          movement_type: 'ADJUSTMENT',
          origin: 'MANUAL',
          minutes: 15,
          valuation_method: null,
          applied_rate: null,
          amount: null,
          authorized_by: null,
          authorized_at: null,
          reason: 'Correction',
        },
      ],
    }
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.getByText('Manual')).toBeTruthy()
    expect(screen.getByText('Ajuste')).toBeTruthy()
  })

  it('shows the "Movimiento manual" button when the actor can update employees', () => {
    mockCan.mockReturnValue(true)
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.getByText('Movimiento manual')).toBeTruthy()
  })

  it('hides the "Movimiento manual" button when the actor cannot update employees', () => {
    mockCan.mockReturnValue(false)
    render(<OvertimeBankSection employeeId="emp-001" />)

    expect(screen.queryByText('Movimiento manual')).toBeNull()
  })

  it('calls openManualMovementDialog when the button is clicked', () => {
    render(<OvertimeBankSection employeeId="emp-001" />)

    screen.getByText('Movimiento manual').click()

    expect(mockState.openManualMovementDialog).toHaveBeenCalledOnce()
  })
})
