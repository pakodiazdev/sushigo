// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOvertimeDecision, useOvertimeValuationPreview } from '@/services/attendance-hooks'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/attendance-api', () => ({
  attendanceApi: {
    today: vi.fn(),
    checkIn: vi.fn(),
    lunchStart: vi.fn(),
    lunchReturn: vi.fn(),
    checkOut: vi.fn(),
    closeDay: vi.fn(),
    overtimeDecision: vi.fn(),
    previewOvertimeValuation: vi.fn(),
  },
}))

import { attendanceApi } from '@/services/attendance-api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const mockAuthorizeResponse = {
  data: {
    status: 200,
    data: {
      id: 'att-123',
      employee_id: 'emp-001',
      overtime_minutes: 35,
      overtime_authorized: true,
      overtime_authorized_at: '2026-04-02T22:10:00+00:00',
      requires_overtime_decision: false,
    },
  },
}

const mockRejectResponse = {
  data: {
    status: 200,
    data: {
      id: 'att-456',
      employee_id: 'emp-002',
      overtime_minutes: 30,
      overtime_authorized: false,
      overtime_authorized_at: '2026-04-02T22:10:00+00:00',
      requires_overtime_decision: false,
    },
  },
}

// ── useOvertimeDecision ────────────────────────────────────────────────────────

describe('useOvertimeDecision', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.overtimeDecision with correct params (authorize)', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce(mockAuthorizeResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        authorize: true,
        valuation_method: 'LFT_PROPORTIONAL',
      })
    })

    expect(attendanceApi.overtimeDecision).toHaveBeenCalledWith('att-123', {
      authorize: true,
      valuation_method: 'LFT_PROPORTIONAL',
    })
  })

  it('calls attendanceApi.overtimeDecision with correct params (reject)', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce(mockRejectResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-456',
        authorize: false,
      })
    })

    expect(attendanceApi.overtimeDecision).toHaveBeenCalledWith('att-456', { authorize: false })
  })

  it('passes valuation_method and agreed_rate through to attendanceApi.overtimeDecision', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce(mockAuthorizeResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-789',
        authorize: true,
        valuation_method: 'AGREED_RATE',
        agreed_rate: 90,
      })
    })

    expect(attendanceApi.overtimeDecision).toHaveBeenCalledWith('att-789', {
      authorize: true,
      valuation_method: 'AGREED_RATE',
      agreed_rate: 90,
    })
  })

  it('shows success toast with "autorizadas" message when authorize=true', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce(mockAuthorizeResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        authorize: true,
        valuation_method: 'LFT_PROPORTIONAL',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Horas extra autorizadas.',
      'Decisión registrada'
    )
  })

  it('shows success toast with "no pagadas" message when authorize=false', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce(mockRejectResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ attendance_id: 'att-456', authorize: false })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Horas extra no pagadas.',
      'Decisión registrada'
    )
  })

  it('shows error toast on failure', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockRejectedValueOnce(
      new Error('Server error')
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          attendance_id: 'att-123',
          authorize: true,
          valuation_method: 'LFT_PROPORTIONAL',
        })
      } catch {
        // expected
      }
    })

    expect(mockShowError).toHaveBeenCalledWith(
      expect.any(String),
      'Error al registrar'
    )
  })

  it('invalidates today attendance queries on success', async () => {
    vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce(mockAuthorizeResponse as never)
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useOvertimeDecision(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        authorize: true,
        valuation_method: 'LFT_PROPORTIONAL',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['attendances', 'daily'] })
    )
  })
})

// ── useOvertimeValuationPreview ─────────────────────────────────────────────────

describe('useOvertimeValuationPreview', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.previewOvertimeValuation with attendanceId and params', async () => {
    vi.mocked(attendanceApi.previewOvertimeValuation).mockResolvedValueOnce({
      data: { status: 200, data: { valuation_method: 'AGREED_RATE', rate_applied: 90, amount: 45, accumulated_hours: null } },
    } as never)
    const { wrapper } = makeWrapper()

    const { result } = renderHook(
      () => useOvertimeValuationPreview('att-1', { valuation_method: 'AGREED_RATE', agreed_rate: 90 }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(attendanceApi.previewOvertimeValuation).toHaveBeenCalledWith('att-1', {
      valuation_method: 'AGREED_RATE',
      agreed_rate: 90,
    })
    expect(result.current.data).toEqual({ valuation_method: 'AGREED_RATE', rate_applied: 90, amount: 45, accumulated_hours: null })
  })

  it('does not call the API when attendanceId is null', () => {
    const { wrapper } = makeWrapper()
    renderHook(
      () => useOvertimeValuationPreview(null, { valuation_method: 'AGREED_RATE', agreed_rate: 90 }),
      { wrapper },
    )
    expect(attendanceApi.previewOvertimeValuation).not.toHaveBeenCalled()
  })

  it('does not call the API when params is null', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useOvertimeValuationPreview('att-1', null), { wrapper })
    expect(attendanceApi.previewOvertimeValuation).not.toHaveBeenCalled()
  })
})
