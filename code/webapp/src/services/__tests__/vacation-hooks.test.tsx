// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { VacationEntitlement } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetEntitlements = vi.fn()

vi.mock('@/services/vacation.service', () => ({
  vacationApi: {
    getEntitlements: (...args: unknown[]) => mockGetEntitlements(...args),
  },
}))

import { useVacationEntitlements } from '../vacation-hooks'

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
