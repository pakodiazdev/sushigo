// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import React from 'react'
import type { Employee } from '@/types/employee'

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

vi.mock('@/services/negotiated-extra-day-hooks', () => ({
  useCancelNegotiatedExtraDay: () => ({ mutate: vi.fn(), isPending: false }),
}))

const mockUseNegotiatedExtraDays = vi.fn()
vi.mock('../use-negotiated-extra-days', () => ({
  useNegotiatedExtraDays: (...args: unknown[]) => mockUseNegotiatedExtraDays(...args),
}))

import { ExtraDaySection } from '../extra-day-section'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employee = {
  id: 'emp-1',
  first_name: 'Ana',
  last_name: 'López',
} as unknown as Employee

function defaultHookCtx(overrides = {}) {
  return {
    thisMonthCount: 0,
    upcomingCount: 0,
    upcomingDays: [],
    isLoadingSummary: false,
    showHistory: false,
    openHistory: vi.fn(),
    closeHistory: vi.fn(),
    historyExtraDays: [],
    historyMeta: undefined,
    historyIsLoading: false,
    historyFilters: {},
    setHistoryFilters: vi.fn(),
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
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({ isLoadingSummary: true }))

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText('Sin días extra registrados')).toBeNull()
  })

  it('shows empty state when no extra days and not loading', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Sin días extra registrados')).toBeTruthy()
  })

  it('hides the "+ Día extra" button when user lacks approve permission', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByText('Día extra')).toBeNull()
  })

  it('shows the "+ Día extra" button when user has approve permission', () => {
    mockCan.mockImplementation((p: string) => p === 'employee-requests.approve')
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Día extra')).toBeTruthy()
  })

  it('opens ExtraDayForm when button is clicked', () => {
    mockCan.mockImplementation((p: string) => p === 'employee-requests.approve')
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(screen.queryByTestId('extra-day-form')).toBeNull()

    fireEvent.click(screen.getByText('Día extra'))

    expect(screen.getByTestId('extra-day-form')).toBeTruthy()
  })

  it('shows upcoming day row when upcomingDays is non-empty', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx({
      upcomingCount: 1,
      upcomingDays: [{
        id: 'ned-1',
        date: '2026-06-15',
        agreed_daily_wage: '800.00',
        prima_percent: 75,
        notes: null,
        created_at: '2026-04-25T00:00:00Z',
      }],
    }))

    render(<ExtraDaySection employee={employee} />)

    expect(screen.getByText('Próximos días extra')).toBeTruthy()
    expect(screen.getByText('Prima 75%')).toBeTruthy()
  })

  it('passes employeeId to useNegotiatedExtraDays', () => {
    mockCan.mockReturnValue(false)
    mockUseNegotiatedExtraDays.mockReturnValue(defaultHookCtx())

    render(<ExtraDaySection employee={employee} />)

    expect(mockUseNegotiatedExtraDays).toHaveBeenCalledWith('emp-1')
  })
})
