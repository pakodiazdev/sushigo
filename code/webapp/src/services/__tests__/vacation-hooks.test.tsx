// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
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

import { useVacationEntitlements, useRegisterEntitlement } from '../vacation-hooks'

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
  it('returns entitlements data from the API', async () => {
    mockGetEntitlements.mockResolvedValue({ data: { data: [fakeEntitlement] } })

    const { result } = renderHook(() => useVacationEntitlements(EMP_ID), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeEntitlement])
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

// ── useRegisterEntitlement ────────────────────────────────────────────────────

describe('useRegisterEntitlement', () => {
  it('calls registerEntitlement and shows success toast on success', async () => {
    mockRegisterEntitlement.mockResolvedValue({ data: { data: fakeEntitlement } })
    mockGetEntitlements.mockResolvedValue({ data: { data: [fakeEntitlement] } })

    const { result } = renderHook(() => useRegisterEntitlement(EMP_ID), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({ year: 2026 })
    })

    expect(mockRegisterEntitlement).toHaveBeenCalledWith(EMP_ID, { year: 2026 })
    expect(mockShowSuccess).toHaveBeenCalledWith('Derecho vacacional registrado correctamente.')
  })

  it('shows error toast when mutation fails', async () => {
    mockRegisterEntitlement.mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useRegisterEntitlement(EMP_ID), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({ year: 2026 }).catch(() => null)
    })

    expect(mockShowError).toHaveBeenCalled()
  })
})
