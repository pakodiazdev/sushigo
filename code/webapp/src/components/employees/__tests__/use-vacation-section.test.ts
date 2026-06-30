// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { VacationEntitlement } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetEntitlements = vi.fn()
const mockRegisterEntitlement = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/vacation.service', () => ({
  vacationApi: {
    getEntitlements: (...args: unknown[]) => mockGetEntitlements(...args),
    registerEntitlement: (...args: unknown[]) => mockRegisterEntitlement(...args),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
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

beforeEach(() => {
  vi.clearAllMocks()
  mockGetEntitlements.mockResolvedValue({ data: { data: [] } })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useVacationSection', () => {
  it('starts with showForm false and empty entitlements', async () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.showForm).toBe(false)
    expect(result.current.entitlements).toEqual([])
  })

  it('opens and closes the form', async () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => { result.current.openForm() })
    expect(result.current.showForm).toBe(true)

    act(() => { result.current.closeForm() })
    expect(result.current.showForm).toBe(false)
  })

  it('loads entitlements from the API', async () => {
    mockGetEntitlements.mockResolvedValue({ data: { data: [fakeEntitlement] } })

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.entitlements).toHaveLength(1))
    expect(result.current.entitlements[0]).toEqual(fakeEntitlement)
  })

  it('closes the form after successful submission', async () => {
    mockRegisterEntitlement.mockResolvedValue({ data: { data: fakeEntitlement } })

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => { result.current.openForm() })
    expect(result.current.showForm).toBe(true)

    await act(async () => {
      await result.current.handleSubmit(undefined)
    })

    await waitFor(() => expect(result.current.showForm).toBe(false))
  })

  it('keeps form open and shows error toast on API error', async () => {
    const apiError = {
      response: {
        status: 422,
        data: {
          errors: { year: ['El año 2026 ya está registrado para este empleado.'] },
        },
      },
    }
    mockRegisterEntitlement.mockRejectedValue(apiError)

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => { result.current.openForm() })

    await act(async () => {
      await result.current.handleSubmit(undefined)
    })

    expect(result.current.showForm).toBe(true)
    expect(mockShowError).toHaveBeenCalled()
  })

  it('returns isPending true while mutation is in flight', async () => {
    let resolve: (v: unknown) => void = () => null
    mockRegisterEntitlement.mockImplementation(
      () => new Promise((r) => { resolve = r }),
    )

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => { result.current.openForm() })

    act(() => {
      result.current.handleSubmit(undefined)
    })

    await waitFor(() => expect(result.current.isPending).toBe(true))
    act(() => { resolve({ data: { data: fakeEntitlement } }) })
  })
})
