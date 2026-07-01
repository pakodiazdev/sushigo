// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { VacationEntitlement } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetEntitlements = vi.fn()

vi.mock('@/services/vacation.service', () => ({
  vacationApi: {
    getEntitlements: (...args: unknown[]) => mockGetEntitlements(...args),
  },
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useVacationSection', () => {
  it('starts with empty entitlements while loading', () => {
    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    expect(result.current.entitlements).toEqual([])
  })

  it('loads entitlements from the API', async () => {
    mockGetEntitlements.mockResolvedValue({ data: { data: [fakeEntitlement] } })

    const { result } = renderHook(() => useVacationSection(EMP_ID), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.entitlements).toHaveLength(1))
    expect(result.current.entitlements[0]).toEqual(fakeEntitlement)
    expect(result.current.isLoading).toBe(false)
  })
})
