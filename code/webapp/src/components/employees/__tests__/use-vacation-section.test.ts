// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { VacationEntitlement } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetEntitlements = vi.fn()
const mockListEmployeeVacationRequests = vi.fn()
const mockApproveRequest = vi.fn()
const mockRejectRequest = vi.fn()

vi.mock('@/services/vacation.service', () => ({
  vacationApi: {
    getEntitlements: (...args: unknown[]) => mockGetEntitlements(...args),
    createVacationRequest: vi.fn(),
    approveRequest: (...args: unknown[]) => mockApproveRequest(...args),
    rejectRequest: (...args: unknown[]) => mockRejectRequest(...args),
    listEmployeeVacationRequests: (...args: unknown[]) => mockListEmployeeVacationRequests(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

import { useVacationSection } from '@/components/employees/use-vacation-section'

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
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

const fakeEmployee = { id: EMP_ID, user: { first_name: 'Carlos', last_name: 'Mendoza', avatar_url: null } }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetEntitlements.mockResolvedValue({ data: { data: [], meta: null } })
  mockListEmployeeVacationRequests.mockResolvedValue({ data: { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } } })
  mockApproveRequest.mockResolvedValue({ data: {} })
  mockRejectRequest.mockResolvedValue({ data: {} })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useVacationSection', () => {
  it('starts with empty entitlements while loading', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    expect(result.current.entitlements).toEqual([])
    expect(result.current.summary).toBeNull()
  })

  it('loads entitlements from the API', async () => {
    mockGetEntitlements.mockResolvedValue({ data: { data: [fakeEntitlement], meta: null } })

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.entitlements).toHaveLength(1))
    expect(result.current.entitlements[0]).toEqual(fakeEntitlement)
    expect(result.current.isLoading).toBe(false)
  })

  it('loads the seniority summary from the API', async () => {
    const summary = { seniority_years: 2, next_anniversary_date: '2027-03-15' }
    mockGetEntitlements.mockResolvedValue({ data: { data: [], meta: summary } })

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.summary).toEqual(summary))
  })

  it('pendingRequestEmployee is null when no employee is provided', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    expect(result.current.pendingRequestEmployee).toBeNull()
  })

  it('pendingRequestEmployee reflects the provided employee', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID, fakeEmployee), {
      wrapper: createWrapper(),
    })

    expect(result.current.pendingRequestEmployee).toEqual(fakeEmployee)
  })

  it('openRequestDialog does nothing without an employee', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    result.current.openRequestDialog()

    expect(result.current.showRequestDialog).toBe(false)
  })

  it('openRequestDialog shows the dialog when an employee is provided', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID, fakeEmployee), {
      wrapper: createWrapper(),
    })

    act(() => result.current.openRequestDialog())

    expect(result.current.showRequestDialog).toBe(true)
  })

  it('closeRequestDialog hides the dialog', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID, fakeEmployee), {
      wrapper: createWrapper(),
    })

    act(() => result.current.openRequestDialog())
    act(() => result.current.closeRequestDialog())

    expect(result.current.showRequestDialog).toBe(false)
  })

  it('handleApprove calls the approve action when confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    result.current.handleApprove('vac-req-1')

    await waitFor(() => expect(mockApproveRequest).toHaveBeenCalledWith('vac-req-1'))

    vi.unstubAllGlobals()
  })

  it('handleApprove does not call the approve action when cancelled', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    result.current.handleApprove('vac-req-1')

    expect(mockApproveRequest).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('handleReject calls the reject action when confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    result.current.handleReject('vac-req-1')

    await waitFor(() => expect(mockRejectRequest).toHaveBeenCalledWith('vac-req-1'))

    vi.unstubAllGlobals()
  })

  it('handleReject does not call the reject action when cancelled', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    result.current.handleReject('vac-req-1')

    expect(mockRejectRequest).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
