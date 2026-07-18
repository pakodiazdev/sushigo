// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { EmployeeVacationPolicyOverride } from '@/types/attendance-payroll'

const mockUpdateOverride = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/employee-vacation-policy-api', () => ({
  employeeVacationPolicyApi: {
    updateOverride: (...args: unknown[]) => mockUpdateOverride(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useUpdateEmployeeVacationPolicy } from '../employee-vacation-policy-hooks'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return { wrapper, qc }
}

const fakeOverride: EmployeeVacationPolicyOverride = {
  rule_key: 'ContractualPolicy',
  tiers: [{ years_from: 1, days: 30 }],
  active_rule_label: 'Política contractual',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUpdateEmployeeVacationPolicy', () => {
  const payload = { rule_key: 'ContractualPolicy' as const, tiers: [{ years_from: 1, days: 30 }] }

  it('calls employeeVacationPolicyApi.updateOverride with employeeId and payload', async () => {
    mockUpdateOverride.mockResolvedValue({ data: { data: fakeOverride } })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateEmployeeVacationPolicy('emp-001'), { wrapper })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateOverride).toHaveBeenCalledWith('emp-001', payload)
  })

  it('shows success toast on success', async () => {
    mockUpdateOverride.mockResolvedValue({ data: { data: fakeOverride } })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateEmployeeVacationPolicy('emp-001'), { wrapper })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('invalidates the vacation-entitlements and employee queries on success', async () => {
    mockUpdateOverride.mockResolvedValue({ data: { data: fakeOverride } })
    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateEmployeeVacationPolicy('emp-001'), { wrapper })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vacation-entitlements', 'emp-001'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['employees', 'emp-001'] })
  })

  it('shows error toast on failure', async () => {
    mockUpdateOverride.mockRejectedValue(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateEmployeeVacationPolicy('emp-001'), { wrapper })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })
})
