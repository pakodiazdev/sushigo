// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { VacationEntitlement, VacationSummary, VacationRequest } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockState = {
  entitlements: [] as VacationEntitlement[],
  summary: null as VacationSummary | null,
  isLoading: false,
  requests: [] as VacationRequest[],
  isLoadingRequests: false,
  showRequestDialog: false,
  pendingRequestEmployee: null,
  openRequestDialog: vi.fn(),
  closeRequestDialog: vi.fn(),
  handleApprove: vi.fn(),
  handleReject: vi.fn(),
  isApproving: false,
  isRejecting: false,
}

vi.mock('@/components/employees/use-vacation-section', () => ({
  useVacationSection: () => mockState,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/employees/RegisterVacationRequestDialog', () => ({
  RegisterVacationRequestDialog: () => null,
}))

import { VacationSection } from '@/components/employees/vacation-section'

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockState = {
    entitlements: [],
    summary: null,
    isLoading: false,
    requests: [],
    isLoadingRequests: false,
    showRequestDialog: false,
    pendingRequestEmployee: null,
    openRequestDialog: vi.fn(),
    closeRequestDialog: vi.fn(),
    handleApprove: vi.fn(),
    handleReject: vi.fn(),
    isApproving: false,
    isRejecting: false,
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

  it('shows seniority years and next anniversary date when summary is present', () => {
    mockState = {
      ...mockState,
      summary: { seniority_years: 2, next_anniversary_date: '2027-03-15' },
    }
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText(/2 años de antigüedad/)).toBeTruthy()
    expect(screen.getByText(/Próximo aniversario: 15 mar 2027/)).toBeTruthy()
  })

  it('uses singular wording for a single year of seniority', () => {
    mockState = {
      ...mockState,
      summary: { seniority_years: 1, next_anniversary_date: null },
    }
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText(/1 año de antigüedad/)).toBeTruthy()
  })

  it('does not render the summary line when summary is null', () => {
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.queryByText(/antigüedad/)).toBeNull()
  })

  it('renders the request vacation button', () => {
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText('Solicitar vacaciones')).toBeTruthy()
  })

  it('shows empty state when there are no vacation requests', () => {
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText('Sin solicitudes de vacaciones')).toBeTruthy()
  })

  it('renders vacation requests with status badge', () => {
    mockState = {
      ...mockState,
      requests: [
        {
          id: 'vr-001',
          employee_id: 'emp-001',
          start_date: '2026-08-10',
          end_date: '2026-08-12',
          dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
          days_count: 3,
          status: 'PENDING',
          requested_by: 'Admin',
          approved_by: null,
          approved_at: null,
          notes: null,
          created_at: '2026-08-01T08:00:00+00:00',
        },
      ],
    }
    render(<VacationSection employeeId="emp-001" />)

    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Pendiente')).toBeTruthy()
  })
})
