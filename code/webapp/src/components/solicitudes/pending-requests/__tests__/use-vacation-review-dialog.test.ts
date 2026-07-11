// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVacationReviewDialog } from '../use-vacation-review-dialog'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockApproveMutate = vi.fn()
const mockRejectMutate = vi.fn()

vi.mock('@/services/employee-request-hooks', () => ({
  useApproveEmployeeRequest: () => ({ mutate: mockApproveMutate, isPending: false }),
  useRejectEmployeeRequest: () => ({ mutate: mockRejectMutate, isPending: false }),
}))

// ── Fixture ────────────────────────────────────────────────────────────────────

const request: EmployeeRequest = {
  id: 'req-1',
  employee_id: 'emp-1',
  employee_name: 'Ana García',
  type: 'VACATION',
  status: 'PENDING',
  payload: { dates: ['2026-08-10', '2026-08-12'] },
  requestable: null,
  requested_by: 'emp-1',
  approved_by: null,
  approved_at: null,
  notes: null,
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('useVacationReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleApprove calls approve mutation with the request id, no overrides', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useVacationReviewDialog(request, onClose))

    act(() => result.current.handleApprove())

    expect(mockApproveMutate).toHaveBeenCalledWith({ id: 'req-1' }, { onSuccess: onClose })
  })

  it('handleReject calls reject mutation with the trimmed reason', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useVacationReviewDialog(request, onClose))

    act(() => result.current.setRejectReason('  Sin cobertura  '))
    act(() => result.current.handleReject())

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { id: 'req-1', reason: 'Sin cobertura' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('handleReject sends undefined reason when left blank', () => {
    const { result } = renderHook(() => useVacationReviewDialog(request, vi.fn()))

    act(() => result.current.handleReject())

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { id: 'req-1', reason: undefined },
      expect.anything()
    )
  })

  it('reject onSuccess closes the confirm dialog, clears the reason and calls onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useVacationReviewDialog(request, onClose))

    act(() => result.current.setShowRejectConfirm(true))
    act(() => result.current.setRejectReason('motivo'))
    act(() => result.current.handleReject())

    const [, options] = mockRejectMutate.mock.calls[0] as [unknown, { onSuccess: () => void }]
    act(() => options.onSuccess())

    expect(result.current.showRejectConfirm).toBe(false)
    expect(result.current.rejectReason).toBe('')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
