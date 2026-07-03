// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { OvertimePayConfig } from '@/types/attendance-payroll'

const mockGetOvertimeConfig = vi.fn()
const mockSetOvertimeConfig = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/overtime.service', () => ({
  overtimeConfigApi: {
    getOvertimeConfig: (...args: unknown[]) => mockGetOvertimeConfig(...args),
    setOvertimeConfig: (...args: unknown[]) => mockSetOvertimeConfig(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useOvertimeConfig, useSetOvertimeConfig } from '../overtime-hooks'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeConfig: OvertimePayConfig = {
  id: 'cfg-1',
  valuation_method: 'AGREED_RATE',
  lft_factor: null,
  hourly_rate: 90,
  effective_from: '2026-01-01',
  effective_to: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOvertimeConfig', () => {
  it('returns config data for employee', async () => {
    mockGetOvertimeConfig.mockResolvedValue({ data: { data: [fakeConfig] } })
    const { result } = renderHook(() => useOvertimeConfig('emp-1'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeConfig])
    expect(mockGetOvertimeConfig).toHaveBeenCalledWith('emp-1')
  })

  it('starts with data undefined', () => {
    mockGetOvertimeConfig.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useOvertimeConfig('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useSetOvertimeConfig', () => {
  const payload = { valuation_method: 'AGREED_RATE' as const, hourly_rate: 90, effective_from: '2026-05-01' }

  it('calls setOvertimeConfig with employeeId and payload', async () => {
    mockSetOvertimeConfig.mockResolvedValue({ data: { data: fakeConfig } })
    const { result } = renderHook(() => useSetOvertimeConfig('emp-1'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockSetOvertimeConfig).toHaveBeenCalledWith('emp-1', payload)
  })

  it('shows success toast on success', async () => {
    mockSetOvertimeConfig.mockResolvedValue({ data: { data: fakeConfig } })
    const { result } = renderHook(() => useSetOvertimeConfig('emp-1'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows error toast on failure', async () => {
    mockSetOvertimeConfig.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useSetOvertimeConfig('emp-1'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useSetOvertimeConfig('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
