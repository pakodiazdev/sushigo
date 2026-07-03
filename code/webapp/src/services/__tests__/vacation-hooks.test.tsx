// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { VacationEntitlement, VacationRequest } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetEntitlements = vi.fn()
const mockCreateVacationRequest = vi.fn()
const mockApproveRequest = vi.fn()
const mockRejectRequest = vi.fn()
const mockListEmployeeVacationRequests = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/vacation.service', () => ({
  vacationApi: {
    getEntitlements: (...args: unknown[]) => mockGetEntitlements(...args),
    createVacationRequest: (...args: unknown[]) => mockCreateVacationRequest(...args),
    approveRequest: (...args: unknown[]) => mockApproveRequest(...args),
    rejectRequest: (...args: unknown[]) => mockRejectRequest(...args),
    listEmployeeVacationRequests: (...args: unknown[]) => mockListEmployeeVacationRequests(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useVacationEntitlements, useVacationRequests, useCreateVacationRequest, useVacationRequestActions } from '../vacation-hooks'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeEntitlement: VacationEntitlement = {
  id: 1,
  year: 2026,
  entitled_days: 22,
  used_days: 0,
  remaining_days: 22,
  rule_key: 'VacationsLFTMX',
}

const EMP_ID = 'emp-001'

beforeEach(() => {
  vi.clearAllMocks()
})

// ── useVacationEntitlements ───────────────────────────────────────────────────

describe('useVacationEntitlements', () => {
  it('returns entitlements and summary data from the API', async () => {
    const summary = { seniority_years: 2, next_anniversary_date: '2027-03-15' }
    mockGetEntitlements.mockResolvedValue({ data: { data: [fakeEntitlement], meta: summary } })

    const { result } = renderHook(() => useVacationEntitlements(EMP_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ entitlements: [fakeEntitlement], summary })
    expect(mockGetEntitlements).toHaveBeenCalledWith(EMP_ID)
  })

  it('does not fetch when employeeId is empty', async () => {
    const { result } = renderHook(() => useVacationEntitlements(''), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(mockGetEntitlements).not.toHaveBeenCalled()
  })
})

// ── useVacationRequests ───────────────────────────────────────────────────────

const fakeVacationRequest: VacationRequest = {
  id: 'vr-001',
  employee_id: 'emp-001',
  start_date: '2026-08-10',
  end_date: '2026-08-12',
  days_count: 3,
  status: 'PENDING',
  requested_by: 'Admin User',
  approved_by: null,
  approved_at: null,
  notes: null,
  created_at: '2026-08-01T08:00:00+00:00',
}

describe('useVacationRequests', () => {
  it('returns paginated vacation requests for an employee', async () => {
    mockListEmployeeVacationRequests.mockResolvedValue({
      data: { data: [fakeVacationRequest], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } },
    })

    const { result } = renderHook(() => useVacationRequests('emp-001'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toEqual([fakeVacationRequest])
    expect(mockListEmployeeVacationRequests).toHaveBeenCalledWith('emp-001', {})
  })

  it('does not fetch when employeeId is empty', async () => {
    const { result } = renderHook(() => useVacationRequests(''), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(mockListEmployeeVacationRequests).not.toHaveBeenCalled()
  })
})

// ── useCreateVacationRequest ──────────────────────────────────────────────────

describe('useCreateVacationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls createVacationRequest API and shows success toast', async () => {
    mockCreateVacationRequest.mockResolvedValue({ data: { status: 201, data: fakeVacationRequest } })

    const { result } = renderHook(() => useCreateVacationRequest(), {
      wrapper: makeWrapper(),
    })

    result.current.mutate({
      employee_id: 'emp-001',
      start_date: '2026-08-10',
      end_date: '2026-08-12',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateVacationRequest).toHaveBeenCalledOnce()
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Solicitud de vacaciones creada. Pendiente de aprobación.',
      'Solicitud'
    )
  })

  it('shows error toast on failure', async () => {
    mockCreateVacationRequest.mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useCreateVacationRequest(), {
      wrapper: makeWrapper(),
    })

    result.current.mutate({
      employee_id: 'emp-001',
      start_date: '2026-08-10',
      end_date: '2026-08-12',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })
})

// ── useVacationRequestActions ─────────────────────────────────────────────────

describe('useVacationRequestActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approve calls approveRequest API and shows success toast', async () => {
    mockApproveRequest.mockResolvedValue({ data: { status: 200, data: { ...fakeVacationRequest, status: 'APPROVED' } } })

    const { result } = renderHook(() => useVacationRequestActions('emp-001'), {
      wrapper: makeWrapper(),
    })

    result.current.approve('vr-001')

    await waitFor(() => expect(mockApproveRequest).toHaveBeenCalledWith('vr-001'))
    expect(mockShowSuccess).toHaveBeenCalledWith('Vacaciones aprobadas correctamente.', 'Aprobación')
  })

  it('reject calls rejectRequest API and shows success toast', async () => {
    mockRejectRequest.mockResolvedValue({ data: { status: 200, data: { ...fakeVacationRequest, status: 'REJECTED' } } })

    const { result } = renderHook(() => useVacationRequestActions('emp-001'), {
      wrapper: makeWrapper(),
    })

    result.current.reject('vr-001')

    await waitFor(() => expect(mockRejectRequest).toHaveBeenCalledWith('vr-001'))
    expect(mockShowSuccess).toHaveBeenCalledWith('Solicitud de vacaciones rechazada.', 'Rechazo')
  })

  it('approve shows error toast on failure', async () => {
    mockApproveRequest.mockRejectedValue(new Error('Fail'))

    const { result } = renderHook(() => useVacationRequestActions('emp-001'), {
      wrapper: makeWrapper(),
    })

    result.current.approve('vr-001')

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
  })
})
