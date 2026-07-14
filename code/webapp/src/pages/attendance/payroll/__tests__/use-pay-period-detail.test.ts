// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUsePayPeriodDetail = vi.fn()

vi.mock('@/services/payroll-hooks', () => ({
  usePayPeriodDetail: (...args: unknown[]) => mockUsePayPeriodDetail(...args),
}))

import { usePayPeriodDetailPage } from '../use-pay-period-detail'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePayPeriodDetailPage', () => {
  it('returns the fetched pay period', () => {
    const payPeriod = { id: 'pp-1', status: 'CLOSED', employees: [] }
    mockUsePayPeriodDetail.mockReturnValue({ data: payPeriod, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(mockUsePayPeriodDetail).toHaveBeenCalledWith('pp-1')
    expect(result.current.payPeriod).toBe(payPeriod)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.errorMessage).toBeNull()
  })

  it('returns null payPeriod while loading', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.payPeriod).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('surfaces an error message when the fetch fails (e.g. 404)', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') })

    const { result } = renderHook(() => usePayPeriodDetailPage('unknown-id'))

    expect(result.current.errorMessage).toBeTruthy()
  })
})
