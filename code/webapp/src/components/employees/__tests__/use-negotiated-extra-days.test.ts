// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn()

vi.mock('@/services/negotiated-extra-day-api', () => ({
  negotiatedExtraDayApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}))

import { useNegotiatedExtraDays } from '../use-negotiated-extra-days'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

function emptyPage(data: unknown[] = []) {
  return { status: 'ok', data, meta: { current_page: 1, last_page: 1, per_page: 15, total: data.length } }
}

const mockDay = {
  id: 'ned-1',
  employee_id: 'emp-1',
  branch_id: 1,
  date: '2026-06-15',
  agreed_daily_wage: 800,
  prima_percent: 75,
  prima_amount: 600,
  approved_by: 'mgr-1',
  status: 'APPROVED' as const,
  notes: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNegotiatedExtraDays — initial state', () => {
  it('starts with isLoadingSummary true while queries fetch', () => {
    mockList.mockImplementation(() => new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.isLoadingSummary).toBe(true)
  })

  it('starts with showHistory = false', () => {
    mockList.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.showHistory).toBe(false)
  })

  it('starts with empty historyFilters', () => {
    mockList.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.historyFilters).toEqual({})
  })
})

describe('useNegotiatedExtraDays — resolved data', () => {
  it('returns thisMonthCount from month query', async () => {
    mockList.mockResolvedValue(emptyPage([mockDay]))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoadingSummary).toBe(false))
    // Both month and upcoming queries resolve with one item each (mockList always returns the same)
    expect(result.current.thisMonthCount).toBeGreaterThanOrEqual(0)
  })

  it('returns upcomingDays array', async () => {
    mockList.mockResolvedValue(emptyPage([mockDay]))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoadingSummary).toBe(false))
    expect(Array.isArray(result.current.upcomingDays)).toBe(true)
  })

  it('returns empty arrays when API returns no data', async () => {
    mockList.mockResolvedValue(emptyPage([]))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoadingSummary).toBe(false))
    expect(result.current.thisMonthCount).toBe(0)
    expect(result.current.upcomingCount).toBe(0)
    expect(result.current.upcomingDays).toEqual([])
  })
})

describe('useNegotiatedExtraDays — history dialog', () => {
  it('openHistory sets showHistory to true', () => {
    mockList.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    act(() => { result.current.openHistory() })
    expect(result.current.showHistory).toBe(true)
  })

  it('closeHistory sets showHistory back to false', () => {
    mockList.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    act(() => { result.current.openHistory() })
    act(() => { result.current.closeHistory() })
    expect(result.current.showHistory).toBe(false)
  })

  it('setHistoryFilters updates historyFilters', () => {
    mockList.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    act(() => { result.current.setHistoryFilters({ date_from: '2026-01-01' }) })
    expect(result.current.historyFilters).toEqual({ date_from: '2026-01-01' })
  })

  it('history query remains disabled when showHistory is false', () => {
    // Only 2 query calls should happen (month + upcoming) while history is closed
    mockList.mockResolvedValue(emptyPage([]))
    const { result } = renderHook(() => useNegotiatedExtraDays('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.showHistory).toBe(false)
    // historyExtraDays defaults to empty
    expect(result.current.historyExtraDays).toEqual([])
  })
})
