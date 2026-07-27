// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

let mockBranchId: number | null = 1

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { currentBranch: { id: number } | null }) => unknown) =>
    selector({ currentBranch: mockBranchId ? { id: mockBranchId } : null }),
}))

const mockClosePreviewData: unknown[] = []
const mockMutateAsync = vi.fn()
let mockNextUnclosedData: { periodStart: string; periodEnd: string } | null = null
let mockIsCheckingLatestPeriod = false
let mockClosePreviewRangeArg: { periodStart: string; periodEnd: string } | null = null
let mockNextUnclosedBranchIdArg: number | null | undefined

vi.mock('@/services/payroll-hooks', () => ({
  useClosePreview: (_branchId: number | null, range: { periodStart: string; periodEnd: string } | null) => {
    mockClosePreviewRangeArg = range
    return { data: mockClosePreviewData, isLoading: false, error: null }
  },
  useConfirmClose: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useNextUnclosedPayPeriod: (branchId: number | null) => {
    mockNextUnclosedBranchIdArg = branchId
    return {
      data: mockNextUnclosedData,
      isLoading: mockIsCheckingLatestPeriod,
    }
  },
}))

let mockGateOpen = true
let mockIsCloseGateOpenCall: { periodEnd: string; now?: Date } | null = null
let mockWeeksBetween = 0

vi.mock('@/lib/week', () => ({
  currentWeekRange: () => ({ start: '2026-06-22', end: '2026-06-28' }),
  weekRangeContaining: (dateStr: string) => ({ start: `${dateStr}-week-start`, end: `${dateStr}-week-end` }),
  addDays: (dateStr: string, n: number) => `${dateStr}+${n}d`,
  isCloseGateOpen: (periodEnd: string, now?: Date) => {
    mockIsCloseGateOpenCall = { periodEnd, now }
    return mockGateOpen
  },
  weeksBetween: () => mockWeeksBetween,
}))

interface MockClockState {
  application_now_utc: string
  business_date: string
}

let mockClockState: MockClockState | null = null
const mockFetchClock = vi.fn()

vi.mock('@/stores/clock.store', () => ({
  useApplicationClockStore: (selector: (s: { clockState: MockClockState | null; fetchClock: () => void }) => unknown) =>
    selector({ clockState: mockClockState, fetchClock: mockFetchClock }),
}))

import { useClosePreviewPage } from '../use-close-preview'

beforeEach(() => {
  vi.clearAllMocks()
  mockBranchId = 1
  mockGateOpen = true
  mockIsCloseGateOpenCall = null
  mockWeeksBetween = 0
  mockClockState = null
  mockNextUnclosedData = null
  mockIsCheckingLatestPeriod = false
  mockClosePreviewRangeArg = null
  mockNextUnclosedBranchIdArg = undefined
})

describe('useClosePreviewPage — confirmClose', () => {
  it('confirms the close, navigates to the payroll periods list, and closes the dialog', async () => {
    mockMutateAsync.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.openConfirm()
    })
    expect(result.current.isConfirmOpen).toBe(true)

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      branchId: 1,
      periodStart: result.current.weekRange.periodStart,
      periodEnd: result.current.weekRange.periodEnd,
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/attendance/payroll' })
    expect(result.current.isConfirmOpen).toBe(false)
  })

  it('closes the dialog on mutation failure without navigating', async () => {
    mockMutateAsync.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.openConfirm()
    })

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(result.current.isConfirmOpen).toBe(false)
  })

  it('closes the dialog instead of leaving it stuck open when branchId is missing', async () => {
    mockBranchId = null
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.openConfirm()
    })
    expect(result.current.isConfirmOpen).toBe(true)

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
    expect(result.current.isConfirmOpen).toBe(false)
  })
})

describe('useClosePreviewPage — close gate and rules dialog', () => {
  it('reflects an open gate as canConfirm=true', () => {
    mockGateOpen = true
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.canConfirm).toBe(true)
  })

  it('reflects a closed gate as canConfirm=false', () => {
    mockGateOpen = false
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.canConfirm).toBe(false)
  })

  it('toggles the rules dialog open and closed', () => {
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isRulesOpen).toBe(false)

    act(() => {
      result.current.openRules()
    })
    expect(result.current.isRulesOpen).toBe(true)

    act(() => {
      result.current.closeRules()
    })
    expect(result.current.isRulesOpen).toBe(false)
  })

  it('exposes the fixed current week range', () => {
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22', periodEnd: '2026-06-28' })
  })
})

describe('useClosePreviewPage — application clock', () => {
  it('fetches the application clock on mount', () => {
    renderHook(() => useClosePreviewPage())

    expect(mockFetchClock).toHaveBeenCalled()
  })

  it('falls back to the browser clock when the application clock is unavailable', () => {
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22', periodEnd: '2026-06-28' })
    expect(mockIsCloseGateOpenCall?.now).toBeUndefined()
  })

  it('derives the week range and gate check from the application clock when available', () => {
    mockClockState = {
      application_now_utc: '2026-06-29T02:00:00Z',
      business_date: '2026-06-28',
    }

    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.weekRange).toEqual({
      periodStart: '2026-06-28-week-start',
      periodEnd: '2026-06-28-week-end',
    })
    expect(mockIsCloseGateOpenCall?.now).toEqual(new Date('2026-06-29T02:00:00Z'))
  })
})

describe('useClosePreviewPage — oldest unclosed week', () => {
  it('targets the oldest unclosed week returned by the server, not just the current calendar week', () => {
    // Simulates a missed week: the server-computed target is two weeks before "today" (2026-06-22).
    mockNextUnclosedData = { periodStart: '2026-06-08', periodEnd: '2026-06-14' }
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.weekRange).toEqual({
      periodStart: '2026-06-08',
      periodEnd: '2026-06-14',
    })
  })

  it('falls back to the current calendar week when the server has no target yet (no periods ever closed)', () => {
    mockNextUnclosedData = null
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22', periodEnd: '2026-06-28' })
  })

  it('queries the oldest-unclosed target by branch id', () => {
    renderHook(() => useClosePreviewPage())

    expect(mockNextUnclosedBranchIdArg).toBe(1)
  })

  it('does not fetch the preview while still checking the oldest unclosed target', () => {
    mockIsCheckingLatestPeriod = true
    renderHook(() => useClosePreviewPage())

    expect(mockClosePreviewRangeArg).toBeNull()
  })

  it('reflects the oldest-unclosed-target check in isLoading', () => {
    mockIsCheckingLatestPeriod = true
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isLoading).toBe(true)
  })

  it('sends the oldest unclosed week to confirmClose', async () => {
    mockNextUnclosedData = { periodStart: '2026-06-08', periodEnd: '2026-06-14' }
    mockMutateAsync.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClosePreviewPage())

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      branchId: 1,
      periodStart: '2026-06-08',
      periodEnd: '2026-06-14',
    })
  })
})

describe('useClosePreviewPage — overdue period notice', () => {
  it('is not overdue when the shown week is the current calendar week', () => {
    mockWeeksBetween = 0
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isOverdue).toBe(false)
    expect(result.current.overduePeriodsCount).toBe(0)
  })

  it('is overdue with a count of 1 when exactly one week was missed', () => {
    mockWeeksBetween = 1
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isOverdue).toBe(true)
    expect(result.current.overduePeriodsCount).toBe(1)
  })

  it('is overdue with a count of 2 when two weeks were missed', () => {
    mockWeeksBetween = 2
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isOverdue).toBe(true)
    expect(result.current.overduePeriodsCount).toBe(2)
  })

  it('is not overdue when the target week is ahead of "today" (just closed right at its deadline)', () => {
    // weeksBetween can go negative: the week just closed at Sunday 19:00, so "today" is still
    // technically inside it and the next Monday hasn't arrived yet.
    mockWeeksBetween = -1
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isOverdue).toBe(false)
    expect(result.current.overduePeriodsCount).toBe(-1)
  })
})

describe('useClosePreviewPage — overdue navigation', () => {
  it('has no navigation available when not overdue', () => {
    mockWeeksBetween = 0
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.canViewOlder).toBe(false)
    expect(result.current.canViewNewer).toBe(false)
    expect(result.current.isBrowsingOverdue).toBe(false)
  })

  it('does not shift the displayed week backward when overduePeriodsCount is negative', () => {
    // Regression: clamping the nav offset's upper bound to the raw (negative) overduePeriodsCount
    // collapsed the offset to -1 and shifted weekRange a week into the past.
    mockWeeksBetween = -1
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22', periodEnd: '2026-06-28' })
    expect(result.current.canViewOlder).toBe(false)
    expect(result.current.canViewNewer).toBe(false)
  })

  it('browses through overdue weeks up to the actual current week and back', () => {
    mockWeeksBetween = 2
    const { result } = renderHook(() => useClosePreviewPage())

    // Starts on the oldest unclosed (target) week.
    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22', periodEnd: '2026-06-28' })
    expect(result.current.canViewOlder).toBe(false)
    expect(result.current.canViewNewer).toBe(true)
    expect(result.current.isBrowsingOverdue).toBe(false)
    expect(result.current.isViewingOverdueWeek).toBe(true)

    act(() => {
      result.current.viewNewer()
    })
    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22+7d', periodEnd: '2026-06-28+7d' })
    expect(result.current.isBrowsingOverdue).toBe(true)
    expect(result.current.isViewingOverdueWeek).toBe(true)

    act(() => {
      result.current.viewNewer()
    })
    // Reached the actual current week — can't go further, and it's no longer an overdue week.
    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22+14d', periodEnd: '2026-06-28+14d' })
    expect(result.current.canViewNewer).toBe(false)
    expect(result.current.isViewingOverdueWeek).toBe(false)

    act(() => {
      result.current.viewNewer()
    })
    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22+14d', periodEnd: '2026-06-28+14d' })

    act(() => {
      result.current.viewOlder()
    })
    act(() => {
      result.current.viewOlder()
    })
    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22', periodEnd: '2026-06-28' })
    expect(result.current.canViewOlder).toBe(false)
    expect(result.current.isViewingOverdueWeek).toBe(true)
  })

  it('stops flagging the week as overdue once navigation reaches the actual current week, even though isOverdue (arrows) stays true', () => {
    // Regression: the overdue notice used to be gated on isOverdue alone, which never changes
    // while browsing — so it kept telling the manager "this period is overdue, close it
    // directly" even after they navigated to the actual current week, whose button is
    // correctly disabled because ITS OWN Sunday 19:00 hasn't happened yet. Contradictory UI.
    mockWeeksBetween = 1
    const { result } = renderHook(() => useClosePreviewPage())

    expect(result.current.isOverdue).toBe(true)
    expect(result.current.isViewingOverdueWeek).toBe(true)

    act(() => {
      result.current.viewNewer()
    })

    // Still overdue overall (arrows must stay available to browse back), but the week ON
    // SCREEN right now is the actual current week, not an overdue one.
    expect(result.current.isOverdue).toBe(true)
    expect(result.current.isViewingOverdueWeek).toBe(false)
  })

  it('keeps confirming available while browsing — a past period is closeable regardless of order', () => {
    // The gate exists to stop closing before a period's own weekend is over, not to enforce
    // closing in order — every past week's own Sunday >= 19:00 has already happened.
    mockWeeksBetween = 2
    mockGateOpen = true
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.viewNewer()
    })
    expect(result.current.isBrowsingOverdue).toBe(true)
    expect(result.current.canConfirm).toBe(true)
  })

  it('confirms whatever week is currently browsed, not just the oldest unclosed one', async () => {
    mockWeeksBetween = 2
    mockMutateAsync.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.viewNewer()
    })
    expect(result.current.weekRange).toEqual({ periodStart: '2026-06-22+7d', periodEnd: '2026-06-28+7d' })

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      branchId: 1,
      periodStart: '2026-06-22+7d',
      periodEnd: '2026-06-28+7d',
    })
  })
})
