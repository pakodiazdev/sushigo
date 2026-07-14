// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { OvertimeBankMovement, OvertimeBankSummary } from '@/types/attendance-payroll'

const mockGetBank = vi.fn()
const mockCreateManualMovement = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/overtime-bank-api', () => ({
  overtimeBankApi: {
    getBank: (...args: unknown[]) => mockGetBank(...args),
    createManualMovement: (...args: unknown[]) => mockCreateManualMovement(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useOvertimeBank, useCreateManualOvertimeMovement } from '../overtime-bank-hooks'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeMovement: OvertimeBankMovement = {
  id: 'mov-1',
  date: '2026-06-10',
  movement_type: 'EARNED',
  origin: 'AUTO',
  minutes: 60,
  valuation_method: null,
  applied_rate: null,
  amount: null,
  authorized_by: null,
  authorized_at: null,
  reason: null,
}

const fakeSummary: OvertimeBankSummary = { balance_minutes: 60, balance_formatted: '1:00' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOvertimeBank', () => {
  it('returns movements and summary from the response', async () => {
    mockGetBank.mockResolvedValue({ data: { data: [fakeMovement], meta: fakeSummary } })

    const { result } = renderHook(() => useOvertimeBank('emp-123'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ movements: [fakeMovement], summary: fakeSummary })
    expect(mockGetBank).toHaveBeenCalledWith('emp-123')
  })

  it('starts with data undefined before resolving', () => {
    mockGetBank.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useOvertimeBank('emp-123'), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })

  it('is disabled when employeeId is empty', () => {
    const { result } = renderHook(() => useOvertimeBank(''), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetBank).not.toHaveBeenCalled()
  })
})

describe('useCreateManualOvertimeMovement', () => {
  const payload = { date: '2026-07-13', movement_type: 'USED' as const, minutes: 60, reason: 'Time off' }

  it('calls createManualMovement with the employeeId and payload, then shows a success toast', async () => {
    mockCreateManualMovement.mockResolvedValue({ data: { data: { ...fakeMovement, ...payload } } })

    const { result } = renderHook(() => useCreateManualOvertimeMovement('emp-123'), { wrapper: makeWrapper() })

    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateManualMovement).toHaveBeenCalledWith('emp-123', payload)
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows an error toast when the request fails', async () => {
    mockCreateManualMovement.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useCreateManualOvertimeMovement('emp-123'), { wrapper: makeWrapper() })

    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })
})
