// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

let mockBranchId: number | null = 1

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { currentBranch: { id: number } | null }) => unknown) =>
    selector({ currentBranch: mockBranchId ? { id: mockBranchId } : null }),
}))

const mockUsePayPeriods = vi.fn()

vi.mock('@/services/payroll-hooks', () => ({
  usePayPeriods: (...args: unknown[]) => mockUsePayPeriods(...args),
}))

import { usePayPeriodsListPage } from '../use-pay-periods-list'

beforeEach(() => {
  vi.clearAllMocks()
  mockBranchId = 1
  mockUsePayPeriods.mockReturnValue({
    data: { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    isLoading: false,
    error: null,
  })
})

describe('usePayPeriodsListPage', () => {
  it('reports hasBranch=false when there is no current branch', () => {
    mockBranchId = null
    const { result } = renderHook(() => usePayPeriodsListPage())

    expect(result.current.hasBranch).toBe(false)
  })

  it('queries with the current branch and no filters by default', () => {
    renderHook(() => usePayPeriodsListPage())

    expect(mockUsePayPeriods).toHaveBeenCalledWith({
      branch_id: 1,
      status: undefined,
      period_start: undefined,
      period_end: undefined,
      page: 1,
    })
  })

  it('resets to page 1 when a filter changes after paging forward', () => {
    const { result } = renderHook(() => usePayPeriodsListPage())

    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    act(() => result.current.setStatus('CLOSED'))
    expect(result.current.page).toBe(1)
  })

  it('exposes an error message when the query fails', () => {
    mockUsePayPeriods.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') })
    const { result } = renderHook(() => usePayPeriodsListPage())

    expect(result.current.errorMessage).toBeTruthy()
  })
})
