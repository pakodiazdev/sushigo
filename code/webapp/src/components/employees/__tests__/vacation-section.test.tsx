// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { VacationEntitlement } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockOpenForm = vi.fn()
const mockCloseForm = vi.fn()
const mockHandleSubmit = vi.fn((fn: unknown) => fn)

let mockState = {
  entitlements: [] as VacationEntitlement[],
  isLoading: false,
  showForm: false,
  isPending: false,
}

vi.mock('@/components/employees/use-vacation-section', () => ({
  useVacationSection: () => ({
    ...mockState,
    openForm: mockOpenForm,
    closeForm: mockCloseForm,
    handleSubmit: mockHandleSubmit,
    form: {
      register: () => ({}),
      formState: { errors: {} },
    },
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled }: {
    children: React.ReactNode
    onClick?: () => void
    type?: string
    disabled?: boolean
  }) => (
    <button type={(type ?? 'button') as 'button' | 'submit' | 'reset'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

import { VacationSection } from '@/components/employees/vacation-section'

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockState = {
    entitlements: [],
    isLoading: false,
    showForm: false,
    isPending: false,
  }
})

afterEach(() => {
  cleanup()
})

describe('VacationSection', () => {
  it('renders the section header with LFT badge', () => {
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText('Vacaciones')).toBeTruthy()
    expect(screen.getByText('LFT México 2022')).toBeTruthy()
  })

  it('shows empty state when no entitlements', () => {
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText('Sin derechos vacacionales registrados')).toBeTruthy()
  })

  it('shows loading spinner when isLoading is true', () => {
    mockState = { ...mockState, isLoading: true }
    const { container } = render(<VacationSection employeeId="emp-001" />)

    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows register button and calls openForm on click', () => {
    render(<VacationSection employeeId="emp-001" />)

    const btn = screen.getByText('Registrar derecho')
    fireEvent.click(btn)

    expect(mockOpenForm).toHaveBeenCalledTimes(1)
  })

  it('shows the registration form when showForm is true', () => {
    mockState = { ...mockState, showForm: true }
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByTestId('vacation-register-form')).toBeTruthy()
    expect(screen.getByText('Registrar derecho vacacional')).toBeTruthy()
  })

  it('calls closeForm when X button is clicked', () => {
    mockState = { ...mockState, showForm: true }
    render(<VacationSection employeeId="emp-001" />)

    fireEvent.click(screen.getByLabelText('Cerrar'))

    expect(mockCloseForm).toHaveBeenCalledTimes(1)
  })

  it('renders entitlements table when data is present', () => {
    mockState = {
      ...mockState,
      entitlements: [
        { id: 1, year: 2026, entitled_days: 22, used_days: 0, remaining_days: 22, rule_key: 'VacationsLFTMX' },
        { id: 2, year: 2025, entitled_days: 20, used_days: 5, remaining_days: 15, rule_key: 'VacationsLFTMX' },
      ],
    }
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText('2026')).toBeTruthy()
    expect(screen.getByText('2025')).toBeTruthy()
    expect(screen.getByText('Regla aplicada: LFT México 2022')).toBeTruthy()
  })

  it('applies destructive class when remaining_days is 0', () => {
    mockState = {
      ...mockState,
      entitlements: [
        { id: 1, year: 2024, entitled_days: 12, used_days: 12, remaining_days: 0, rule_key: 'VacationsLFTMX' },
      ],
    }
    const { container } = render(<VacationSection employeeId="emp-001" />)

    const span = container.querySelector('.text-destructive')
    expect(span).toBeTruthy()
  })

  it('applies amber class when remaining_days is low (1-3)', () => {
    mockState = {
      ...mockState,
      entitlements: [
        { id: 1, year: 2024, entitled_days: 12, used_days: 10, remaining_days: 2, rule_key: 'VacationsLFTMX' },
      ],
    }
    const { container } = render(<VacationSection employeeId="emp-001" />)

    const span = container.querySelector('.text-amber-600')
    expect(span).toBeTruthy()
  })
})
