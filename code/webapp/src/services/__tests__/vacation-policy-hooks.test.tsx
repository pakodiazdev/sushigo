// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { VacationPolicySettings } from '@/types/attendance-payroll'

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/vacation-policy-api', () => ({
  vacationPolicyApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useVacationPolicy, useUpdateVacationPolicy } from '../vacation-policy-hooks'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeSettings: VacationPolicySettings = {
  active_rule_key: 'VacationsLFTMX',
  active_rule_label: 'LFT México 2022',
  tiers: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useVacationPolicy', () => {
  it('returns data from get', async () => {
    mockGet.mockResolvedValue({ data: { data: fakeSettings } })
    const { result } = renderHook(() => useVacationPolicy(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeSettings)
  })

  it('starts with data undefined before resolving', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useVacationPolicy(), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useUpdateVacationPolicy', () => {
  const payload = { active_rule_key: 'CustomCompanyPolicy' as const, tiers: [{ years_from: 1, days: 18 }] }

  it('calls vacationPolicyApi.update with the payload', async () => {
    mockUpdate.mockResolvedValue({ data: { data: fakeSettings } })
    const { result } = renderHook(() => useUpdateVacationPolicy(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalledWith(payload)
  })

  it('shows success toast on success', async () => {
    mockUpdate.mockResolvedValue({ data: { data: fakeSettings } })
    const { result } = renderHook(() => useUpdateVacationPolicy(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('Política de vacaciones actualizada.', 'Vacaciones')
  })

  it('shows error toast on failure', async () => {
    mockUpdate.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useUpdateVacationPolicy(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useUpdateVacationPolicy(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
