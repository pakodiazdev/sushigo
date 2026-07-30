// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { SessionStatus } from '@/types/cash'
import type { CashSession, SessionSummary } from '@/types/cash'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUseCashSession = vi.fn()
const mockUseCashSessionSummary = vi.fn()

vi.mock('@/services/cash-hooks', () => ({
  useCashSession: (...args: unknown[]) => mockUseCashSession(...args),
  useCashSessionSummary: (...args: unknown[]) => mockUseCashSessionSummary(...args),
}))

import { useCashSessionDetailPage } from '../use-session-detail'

const mockSession: CashSession = {
  id: 'cs-1',
  operating_date: '2026-07-24',
  opening_balance: '500.00',
  closing_balance: null,
  status: SessionStatus.DRAFT,
  opened_by: 1,
  opened_at: '2026-07-24T08:00:00+00:00',
  posted_by: null,
  posted_at: null,
  meta: null,
  created_at: '2026-07-24T08:00:00+00:00',
  updated_at: '2026-07-24T08:00:00+00:00',
}

const mockSummary: SessionSummary = {
  session: mockSession,
  incomes: [],
  expenses: [],
  closing_balance: '600.00',
  total_incomes: '100.00',
  total_expenses: '0.00',
  current_balance: '600.00',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCashSessionDetailPage', () => {
  it('returns the fetched session and summary', () => {
    mockUseCashSession.mockReturnValue({ data: mockSession, isLoading: false, error: null })
    mockUseCashSessionSummary.mockReturnValue({ data: mockSummary, isLoading: false, error: null })

    const { result } = renderHook(() => useCashSessionDetailPage('cs-1'))

    expect(mockUseCashSession).toHaveBeenCalledWith('cs-1')
    expect(mockUseCashSessionSummary).toHaveBeenCalledWith('cs-1')
    expect(result.current.session).toBe(mockSession)
    expect(result.current.summary).toBe(mockSummary)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.errorMessage).toBeNull()
  })

  it('is loading while either the session or the summary is still fetching', () => {
    mockUseCashSession.mockReturnValue({ data: undefined, isLoading: true, error: null })
    mockUseCashSessionSummary.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => useCashSessionDetailPage('cs-1'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.session).toBeNull()
    expect(result.current.summary).toBeNull()
  })

  it('is loading when only the summary request is still pending', () => {
    mockUseCashSession.mockReturnValue({ data: mockSession, isLoading: false, error: null })
    mockUseCashSessionSummary.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => useCashSessionDetailPage('cs-1'))

    expect(result.current.isLoading).toBe(true)
  })

  it('surfaces an error message when the session fetch fails (e.g. 404)', () => {
    mockUseCashSession.mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') })
    mockUseCashSessionSummary.mockReturnValue({ data: undefined, isLoading: false, error: null })

    const { result } = renderHook(() => useCashSessionDetailPage('unknown-id'))

    expect(result.current.errorMessage).toBeTruthy()
  })

  it('surfaces an error message when the summary fetch fails', () => {
    mockUseCashSession.mockReturnValue({ data: mockSession, isLoading: false, error: null })
    mockUseCashSessionSummary.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') })

    const { result } = renderHook(() => useCashSessionDetailPage('cs-1'))

    expect(result.current.errorMessage).toBeTruthy()
  })
})
