// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUsePendingRequests = vi.fn()

vi.mock('@/services/employee-request-hooks', () => ({
  usePendingRequests: () => mockUsePendingRequests(),
  useCancelEmployeeRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'loader' }),
}))

vi.mock('../pending-request-card', () => ({
  PendingRequestCard: ({ request }: { request: EmployeeRequest }) =>
    React.createElement('div', { 'data-testid': `card-${request.id}` }, request.employee_name),
}))

vi.mock('../review-request-dialog', () => ({
  ReviewRequestDialog: ({ request }: { request: EmployeeRequest | null }) =>
    request
      ? React.createElement('div', { 'data-testid': 'review-dialog' }, request.id)
      : null,
}))

import { PendingRequestsList } from '../pending-requests-list'

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeRequest(id: string): EmployeeRequest {
  return {
    id,
    employee_id: 'emp-1',
    employee_name: 'Ana García',
    avatar_url: null,
    type: 'EXTRA_DAY',
    status: 'PENDING',
    payload: { date: '2026-06-15', salary_pct: 100, salary_day: 200, prima_pct: 100, prima: 200, seventh_day: 200, total: 600 },
    requestable: null,
    requested_by: 'emp-1',
    approved_by: null,
    approved_at: null,
    notes: null,
    rejection_reason: null,
    created_at: '2026-04-24T10:00:00+00:00',
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PendingRequestsList — loading state', () => {
  it('shows a spinner while loading', () => {
    mockUsePendingRequests.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<PendingRequestsList />)
    expect(screen.getByTestId('loader')).toBeDefined()
  })

  it('does not show error message while loading', () => {
    mockUsePendingRequests.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<PendingRequestsList />)
    expect(screen.queryByText(/No se pudieron cargar/)).toBeNull()
  })
})

describe('PendingRequestsList — error state', () => {
  it('shows error message when query fails', () => {
    mockUsePendingRequests.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<PendingRequestsList />)
    expect(screen.getByText(/No se pudieron cargar las solicitudes pendientes/)).toBeDefined()
  })

  it('does not show empty state on error', () => {
    mockUsePendingRequests.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<PendingRequestsList />)
    expect(screen.queryByText(/Sin solicitudes pendientes/)).toBeNull()
  })
})

describe('PendingRequestsList — empty state', () => {
  it('shows empty message when data is empty array', () => {
    mockUsePendingRequests.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<PendingRequestsList />)
    expect(screen.getByText(/Sin solicitudes pendientes de aprobación/)).toBeDefined()
  })

  it('shows empty message when data is undefined (no error)', () => {
    mockUsePendingRequests.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    render(<PendingRequestsList />)
    expect(screen.getByText(/Sin solicitudes pendientes de aprobación/)).toBeDefined()
  })
})

describe('PendingRequestsList — with requests', () => {
  it('renders a card for each request', () => {
    mockUsePendingRequests.mockReturnValue({
      data: [makeRequest('r1'), makeRequest('r2')],
      isLoading: false,
      isError: false,
    })
    render(<PendingRequestsList />)
    expect(screen.getByTestId('card-r1')).toBeDefined()
    expect(screen.getByTestId('card-r2')).toBeDefined()
  })

  it('does not show empty message when there are requests', () => {
    mockUsePendingRequests.mockReturnValue({
      data: [makeRequest('r1')],
      isLoading: false,
      isError: false,
    })
    render(<PendingRequestsList />)
    expect(screen.queryByText(/Sin solicitudes pendientes/)).toBeNull()
  })

  it('renders ReviewRequestDialog (initially closed, no request selected)', () => {
    mockUsePendingRequests.mockReturnValue({
      data: [makeRequest('r1')],
      isLoading: false,
      isError: false,
    })
    render(<PendingRequestsList />)
    expect(screen.queryByTestId('review-dialog')).toBeNull()
  })
})
