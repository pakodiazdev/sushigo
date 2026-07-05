// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLeaveReviewDialog } from '../use-leave-review-dialog'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockApproveMutate = vi.fn()
const mockRejectMutate = vi.fn()

vi.mock('@/services/employee-request-hooks', () => ({
  useApproveEmployeeRequest: () => ({ mutate: mockApproveMutate, isPending: false }),
  useRejectEmployeeRequest: () => ({ mutate: mockRejectMutate, isPending: false }),
}))

vi.mock('@/services/leave-hooks', () => ({
  useLeaveTypes: () => ({
    data: [
      { id: 1, code: 'MEDICAL', name: 'Incapacidad médica', calculation_mode: 'FIXED_PERCENTAGE', default_pay_percentage: 0, default_rest_day_factor: 'NONE', counts_for_bonus: false },
    ],
  }),
}))

let mockWages: Array<{ hourly_rate: string; weekly_scheduled_hours: number }> = []

vi.mock('@/services/employee-hooks', () => ({
  useWageHistory: () => ({ data: mockWages }),
}))

// ── Fixture ────────────────────────────────────────────────────────────────────

const request: EmployeeRequest = {
  id: 'req-1',
  employee_id: 'emp-1',
  employee_name: 'Ana García',
  type: 'LEAVE',
  status: 'PENDING',
  payload: { leave_type_id: 1, dates: ['2026-06-15'] },
  requestable: null,
  requested_by: 'emp-1',
  approved_by: null,
  approved_at: null,
  notes: null,
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('useLeaveReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWages = []
  })

  it('handleApprove calls approve mutation with the request id and the resolved pay_percentage', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.handleApprove())

    expect(mockApproveMutate).toHaveBeenCalledWith(
      { id: 'req-1', data: { pay_percentage: 0 } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('defaults pay option to the leave type default (0%)', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    expect(result.current.payOption).toBe(0)
    expect(result.current.payPercentage).toBe(0)
  })

  it('selecting the 100% quick option updates pay option and percentage', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.selectQuickOption(100))

    expect(result.current.payOption).toBe(100)
    expect(result.current.payPercentage).toBe(100)

    act(() => result.current.handleApprove())

    expect(mockApproveMutate).toHaveBeenCalledWith(
      { id: 'req-1', data: { pay_percentage: 100 } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('selecting the 25%, 50% and 75% quick options works', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.selectQuickOption(25))
    expect(result.current.payOption).toBe(25)
    expect(result.current.payPercentage).toBe(25)

    act(() => result.current.selectQuickOption(50))
    expect(result.current.payOption).toBe(50)
    expect(result.current.payPercentage).toBe(50)

    act(() => result.current.selectQuickOption(75))
    expect(result.current.payOption).toBe(75)
    expect(result.current.payPercentage).toBe(75)
  })

  it('setting a custom percentage switches to custom mode and updates the value', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.setCustomPercentage(35))

    expect(result.current.payOption).toBe('custom')
    expect(result.current.payPercentage).toBe(35)
  })

  it('computes the daily wage and the $ amount for each percentage from wage history', () => {
    mockWages = [{ hourly_rate: '100.00', weekly_scheduled_hours: 48 }]
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    // dailyWage = 100 * (48 / 6) = 800; totalDays = 1 (single date in payload)
    expect(result.current.dailyWage).toBe(800)
    expect(result.current.totalWage).toBe(800)
    expect(result.current.amountForPercentage(50)).toBe(400)

    act(() => result.current.selectQuickOption(50))
    expect(result.current.payAmount).toBe(400)
  })

  it('defaults to the pay_percentage the employee requested at creation, overriding the leave type default', () => {
    const onClose = vi.fn()
    const requestedPaid: EmployeeRequest = {
      ...request,
      payload: { leave_type_id: 1, dates: ['2026-06-15'], pay_percentage: 100 },
    }
    const { result } = renderHook(() => useLeaveReviewDialog(requestedPaid, onClose))

    expect(result.current.requestedPayPercentage).toBe(100)
    expect(result.current.payOption).toBe(100)
    expect(result.current.payPercentage).toBe(100)
  })

  it('requestedPayPercentage is null when the request payload has no pay_percentage', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    expect(result.current.requestedPayPercentage).toBeNull()
  })

  it('setCustomAmount derives the equivalent percentage from the daily wage', () => {
    mockWages = [{ hourly_rate: '100.00', weekly_scheduled_hours: 48 }]
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.setCustomAmount(200))

    expect(result.current.payOption).toBe('custom')
    expect(result.current.payPercentage).toBe(25)
  })

  it('handleApprove onSuccess calls onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.handleApprove())

    const [, options] = mockApproveMutate.mock.calls[0] as [unknown, { onSuccess: () => void }]
    options.onSuccess()

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('handleReject sends the trimmed rejectReason', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.setRejectReason('  No hay cobertura  '))
    act(() => result.current.handleReject())

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { id: 'req-1', reason: 'No hay cobertura' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('handleReject sends undefined reason when empty', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.handleReject())

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { id: 'req-1', reason: undefined },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('handleReject onSuccess closes the confirm dialog, clears the reason, and closes the panel', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => {
      result.current.setShowRejectConfirm(true)
      result.current.setRejectReason('motivo')
    })
    act(() => result.current.handleReject())

    const [, options] = mockRejectMutate.mock.calls[0] as [unknown, { onSuccess: () => void }]
    act(() => options.onSuccess())

    await waitFor(() => {
      expect(result.current.showRejectConfirm).toBe(false)
      expect(result.current.rejectReason).toBe('')
    })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
