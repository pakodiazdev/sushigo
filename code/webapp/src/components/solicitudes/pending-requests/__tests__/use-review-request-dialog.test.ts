// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockApprove = vi.fn()
const mockReject = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/employee-request-hooks', () => ({
  useApproveEmployeeRequest: () => ({ mutate: mockApprove, isPending: false }),
  useRejectEmployeeRequest: () => ({ mutate: mockReject, isPending: false }),
}))

import { useReviewRequestDialog } from '../use-review-request-dialog'

// ── Wrapper ────────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<EmployeeRequest> = {}): EmployeeRequest {
  return {
    id: '01HZTEST00000001',
    employee_id: '01HZTEST00000002',
    employee_name: 'Ana García',
    type: 'EXTRA_DAY',
    status: 'PENDING',
    payload: {
      date: '2026-06-15',
      salary_pct: 100,
      prima_pct: 100,
      salary_day: 200,
      prima: 200,
      seventh_day: 200,
      total: 600,
    },
    requestable: null,
    requested_by: '01HZTEST00000003',
    approved_by: null,
    approved_at: null,
    notes: null,
    rejection_reason: null,
    created_at: '2026-04-24T10:00:00+00:00',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useReviewRequestDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initialises salaryDay from payload when salary_type is registered', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })
    expect(result.current.salaryDay).toBe(200)
  })

  it('computes prima at 100% (legal default)', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })
    expect(result.current.prima).toBe(200)
    expect(result.current.effectivePrimaPct).toBe(100)
  })

  it('computes total as salaryDay + seventhDay + prima', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })
    expect(result.current.total).toBe(600)
  })

  it('switches to agreed salary and recomputes salaryDay', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })

    act(() => {
      result.current.form.setValue('salary_type', 'agreed')
      result.current.form.setValue('salary_pct', 50)
    })

    // baseDailyWage = 200 / 100 * 100 = 200; salaryDay = 200 * 50 / 100 = 100
    expect(result.current.salaryDay).toBe(100)
    expect(result.current.total).toBe(300) // 100 + 100 (seventh) + 100 (prima 100%)
  })

  it('switches to agreed prima and recomputes prima', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })

    act(() => {
      result.current.form.setValue('prima_type', 'agreed')
      result.current.form.setValue('prima_pct', 50)
    })

    // prima = 200 * 50 / 100 = 100
    expect(result.current.prima).toBe(100)
    expect(result.current.effectivePrimaPct).toBe(50)
    expect(result.current.total).toBe(500) // 200 + 200 (seventh) + 100 (prima)
  })

  it('sanitizes NaN to 0 when salary_pct is cleared', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })

    act(() => {
      result.current.form.setValue('salary_type', 'agreed')
      result.current.form.setValue('salary_pct', NaN)
    })

    expect(result.current.salaryDay).toBe(0)
    expect(Number.isNaN(result.current.salaryDay)).toBe(false)
    expect(Number.isNaN(result.current.total)).toBe(false)
  })

  it('sanitizes NaN to 0 when prima_pct is cleared', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })

    act(() => {
      result.current.form.setValue('prima_type', 'agreed')
      result.current.form.setValue('prima_pct', NaN)
    })

    expect(result.current.prima).toBe(0)
    expect(Number.isNaN(result.current.prima)).toBe(false)
    expect(Number.isNaN(result.current.total)).toBe(false)
  })

  it('handleApprove succeeds after agreed→registered switch even if salary_pct was NaN', async () => {
    // Regression for D2: zod schema was rejecting NaN left over from a cleared agreed input
    const onClose = vi.fn()
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), onClose), { wrapper })

    act(() => {
      // Simulate: user selects agreed, clears the input (→ NaN), then switches back to registered
      result.current.form.setValue('salary_type', 'agreed')
      result.current.form.setValue('salary_pct', NaN)
      // Component resets salary_pct to proposedSalaryPct when switching back
      result.current.form.setValue('salary_type', 'registered')
      result.current.form.setValue('salary_pct', 100)
    })

    await act(async () => {
      await result.current.form.handleSubmit(result.current.handleApprove)()
    })

    expect(mockApprove).toHaveBeenCalledOnce()
  })

  it('handleApprove succeeds after agreed→legal prima switch even if prima_pct was NaN', async () => {
    // Regression for D2: same NaN issue on the prima_pct field
    const onClose = vi.fn()
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), onClose), { wrapper })

    act(() => {
      result.current.form.setValue('prima_type', 'agreed')
      result.current.form.setValue('prima_pct', NaN)
      // Component resets prima_pct to 100 when switching back to legal
      result.current.form.setValue('prima_type', 'legal')
      result.current.form.setValue('prima_pct', 100)
    })

    await act(async () => {
      await result.current.form.handleSubmit(result.current.handleApprove)()
    })

    expect(mockApprove).toHaveBeenCalledOnce()
  })

  it('handleApprove calls mutate with computed overrides using registered salary', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), onClose), { wrapper })

    await act(async () => {
      await result.current.form.handleSubmit(result.current.handleApprove)()
    })

    expect(mockApprove).toHaveBeenCalledWith(
      {
        id: '01HZTEST00000001',
        data: expect.objectContaining({
          salary_pct: 100,
          salary_day: 200,
          prima_pct: 100,
          prima: 200,
          seventh_day: 200,
          total: 600,
        }),
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('handleApprove uses agreed salary_pct when salary_type is agreed', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), onClose), { wrapper })

    act(() => {
      result.current.form.setValue('salary_type', 'agreed')
      result.current.form.setValue('salary_pct', 50)
    })

    await act(async () => {
      await result.current.form.handleSubmit(result.current.handleApprove)()
    })

    expect(mockApprove).toHaveBeenCalledWith(
      {
        id: '01HZTEST00000001',
        data: expect.objectContaining({ salary_pct: 50, salary_day: 100 }),
      },
      expect.anything(),
    )
  })

  it('handleReject reads reject_reason from form state and calls mutate', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), onClose), { wrapper })

    act(() => {
      result.current.form.setValue('reject_reason', 'No procede')
    })

    act(() => {
      result.current.handleReject()
    })

    expect(mockReject).toHaveBeenCalledWith(
      { id: '01HZTEST00000001', reason: 'No procede' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('handleReject works even when salary_pct is NaN (reject not blocked by form validation)', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), onClose), { wrapper })

    act(() => {
      result.current.form.setValue('salary_type', 'agreed')
      result.current.form.setValue('salary_pct', NaN)
    })

    act(() => {
      result.current.handleReject()
    })

    // Must still call reject even though salary_pct is NaN
    expect(mockReject).toHaveBeenCalledOnce()
  })

  it('showRejectConfirm starts false and can be toggled', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })
    expect(result.current.showRejectConfirm).toBe(false)

    act(() => {
      result.current.setShowRejectConfirm(true)
    })

    expect(result.current.showRejectConfirm).toBe(true)
  })

  it('exposes proposedSalaryDay and proposedPrimaPct from payload', () => {
    const { result } = renderHook(() => useReviewRequestDialog(makeRequest(), vi.fn()), { wrapper })
    expect(result.current.proposedSalaryDay).toBe(200)
    expect(result.current.proposedPrimaPct).toBe(100)
  })
})
