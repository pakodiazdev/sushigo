// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUseMyExtraDayRequests = vi.fn()
const mockUseCancelEmployeeRequest = vi.fn()

vi.mock('@/services/employee-request-hooks', () => ({
  useMyExtraDayRequests: (id: string) => mockUseMyExtraDayRequests(id),
  useCancelEmployeeRequest: () => mockUseCancelEmployeeRequest(),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'loader' }),
}))

vi.mock('../request-status-card', () => ({
  RequestStatusCard: ({ request }: { request: { id: string; status: string } }) =>
    React.createElement('div', { 'data-testid': `card-${request.id}` }, `Card ${request.status}`),
}))

import { MyRequestsList } from '../my-requests-list'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeRequest(id: string, status = 'PENDING') {
  return { id, status, type: 'EXTRA_DAY', payload: {}, employee_id: 'emp-1', requestable: null, requested_by: null, approved_by: null, approved_at: null, notes: null, rejection_reason: null, created_at: '2026-01-01T00:00:00Z' }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCancelEmployeeRequest.mockReturnValue({ mutate: vi.fn(), isPending: false, variables: undefined })
})

describe('MyRequestsList — loading state', () => {
  it('shows a spinner while loading', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByTestId('loader')).toBeDefined()
  })

  it('does not render cards while loading', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.queryByText(/No tienes solicitudes/)).toBeNull()
  })
})

describe('MyRequestsList — error state', () => {
  it('shows an error message when the query fails', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByText(/No se pudieron cargar/)).toBeDefined()
  })

  it('does not show empty state on error', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.queryByText(/No tienes solicitudes/)).toBeNull()
  })
})

describe('MyRequestsList — empty state', () => {
  it('shows empty message when no requests', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByText('No tienes solicitudes de días extra.')).toBeDefined()
  })

  it('shows empty message when data is undefined', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByText('No tienes solicitudes de días extra.')).toBeDefined()
  })

  it('filters out CANCELLED requests — shows empty if all cancelled', () => {
    mockUseMyExtraDayRequests.mockReturnValue({
      data: [makeRequest('r1', 'CANCELLED')],
      isLoading: false,
      isError: false,
    })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByText('No tienes solicitudes de días extra.')).toBeDefined()
  })
})

describe('MyRequestsList — with requests', () => {
  it('renders a card for each non-cancelled request', () => {
    mockUseMyExtraDayRequests.mockReturnValue({
      data: [makeRequest('r1', 'PENDING'), makeRequest('r2', 'APPROVED')],
      isLoading: false,
      isError: false,
    })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByTestId('card-r1')).toBeDefined()
    expect(screen.getByTestId('card-r2')).toBeDefined()
  })

  it('does not render CANCELLED requests', () => {
    mockUseMyExtraDayRequests.mockReturnValue({
      data: [makeRequest('r1', 'PENDING'), makeRequest('r2', 'CANCELLED')],
      isLoading: false,
      isError: false,
    })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.getByTestId('card-r1')).toBeDefined()
    expect(screen.queryByTestId('card-r2')).toBeNull()
  })

  it('does not show empty message when there are active requests', () => {
    mockUseMyExtraDayRequests.mockReturnValue({
      data: [makeRequest('r1', 'PENDING')],
      isLoading: false,
      isError: false,
    })
    render(<MyRequestsList employeeId="emp-1" />)
    expect(screen.queryByText('No tienes solicitudes de días extra.')).toBeNull()
  })

  it('passes the employeeId to useMyExtraDayRequests', () => {
    mockUseMyExtraDayRequests.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<MyRequestsList employeeId="emp-42" />)
    expect(mockUseMyExtraDayRequests).toHaveBeenCalledWith('emp-42')
  })
})
