// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import React from 'react'
import type { Employee } from '@/types/employee'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }: { children: React.ReactNode; onClick?: () => void; type?: string }) => (
    <button type={(type ?? 'button') as 'button' | 'submit' | 'reset'} onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/employees/extra-day-form', () => ({
  ExtraDayForm: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="extra-day-form">ExtraDayForm</div> : null,
}))

const mockCan = vi.fn()
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { can: (p: string) => boolean }) => unknown) =>
    selector({ can: (p: string) => mockCan(p) }),
}))

const mockUseApprovedExtraDays = vi.fn()
vi.mock('@/services/employee-request-hooks', () => ({
  useApprovedExtraDays: (...args: unknown[]) => mockUseApprovedExtraDays(...args),
}))

import { ExtraDaySection } from '../extra-day-section'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employee = {
  id: 'emp-1',
  first_name: 'Ana',
  last_name: 'López',
} as unknown as Employee

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: 'req-1',
    employee_id: 'emp-1',
    employee_name: 'Ana López',
    type: 'EXTRA_DAY',
    status: 'APPROVED',
    payload: { date: '2026-04-25', prima_pct: 100 },
    requestable: null,
    requested_by: 'emp-1',
    approved_by: null,
    approved_at: null,
    notes: null,
    rejection_reason: null,
    created_at: '2026-04-25T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExtraDaySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('hides empty-state text while data is loading', () => {
    mockCan.mockReturnValue(false)
    mockUseApprovedExtraDays.mockReturnValue({ data: undefined, isLoading: true })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText('No hay días extra acordados')).toBeNull()
  })

  it('shows empty state when no extra days and not loading', () => {
    mockCan.mockReturnValue(false)
    mockUseApprovedExtraDays.mockReturnValue({ data: [], isLoading: false })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('No hay días extra acordados')).toBeTruthy()
  })

  it('hides the "+ Día extra" button when user lacks approve permission', () => {
    mockCan.mockReturnValue(false)
    mockUseApprovedExtraDays.mockReturnValue({ data: [], isLoading: false })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText('Día extra')).toBeNull()
  })

  it('shows the "+ Día extra" button when user has approve permission', () => {
    mockCan.mockImplementation((p: string) => p === 'employee-requests.approve')
    mockUseApprovedExtraDays.mockReturnValue({ data: [], isLoading: false })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Día extra')).toBeTruthy()
  })

  it('opens ExtraDayForm when button is clicked', () => {
    mockCan.mockImplementation((p: string) => p === 'employee-requests.approve')
    mockUseApprovedExtraDays.mockReturnValue({ data: [], isLoading: false })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByTestId('extra-day-form')).toBeNull()

    fireEvent.click(screen.getByText('Día extra'))

    expect(screen.getByTestId('extra-day-form')).toBeTruthy()
  })

  it('renders approved extra-day chips with date and prima_pct', () => {
    mockCan.mockReturnValue(false)
    mockUseApprovedExtraDays.mockReturnValue({
      data: [makeRequest({ payload: { date: '2026-04-25', prima_pct: 75 } })],
      isLoading: false,
    })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Día extra acordado')).toBeTruthy()
    expect(screen.getByText('Prima: 75%')).toBeTruthy()
  })

  it('renders chip without prima when prima_pct is absent', () => {
    mockCan.mockReturnValue(false)
    mockUseApprovedExtraDays.mockReturnValue({
      data: [makeRequest({ payload: { date: '2026-04-25' } })],
      isLoading: false,
    })

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText(/Prima:/)).toBeNull()
  })

  it('passes employeeId to useApprovedExtraDays', () => {
    mockCan.mockReturnValue(false)
    mockUseApprovedExtraDays.mockReturnValue({ data: [], isLoading: false })

    render(<ExtraDaySection employee={employee} />)

    expect(mockUseApprovedExtraDays).toHaveBeenCalledWith('emp-1')
  })
})
