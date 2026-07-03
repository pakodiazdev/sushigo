// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'

function createAxiosError(
  message?: string,
  errors?: Record<string, string[]>,
  status = 422,
): AxiosError<{ message?: string; errors?: Record<string, string[]> }> {
  const error = new AxiosError<{ message?: string; errors?: Record<string, string[]> }>('Request failed')
  error.response = {
    data: { message, errors },
    status,
    statusText: 'Unprocessable Entity',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetClosePreview = vi.fn()
const mockConfirmClose = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/payroll.service', () => ({
  payrollApi: {
    getClosePreview: (...args: unknown[]) => mockGetClosePreview(...args),
    confirmClose: (...args: unknown[]) => mockConfirmClose(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useClosePreview, useConfirmClose } from '../payroll-hooks'

afterEach(() => {
  vi.clearAllMocks()
})

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

const mockRows = [
  {
    employee: { id: 'ulid-1', first_name: 'Ana', last_name: 'Payroll', code: 'P001' },
    base_pay: 4800,
    late_deductions: 0,
    unpaid_leave_deductions: 0,
    overtime_pay: 0,
    extra_day_pay: 0,
    punctuality_bonus: 0,
    holiday_pay: 0,
    other_adjustments: 0,
    total_pay: 4800,
    free_hours_earned: 0,
    pay_period_lines: [],
  },
]

describe('useClosePreview', () => {
  it('is disabled when branchId is null', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useClosePreview(null, null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetClosePreview).not.toHaveBeenCalled()
  })

  it('is disabled when range is null', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useClosePreview(1, null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetClosePreview).not.toHaveBeenCalled()
  })

  it('fetches preview data when branchId and range are provided', async () => {
    mockGetClosePreview.mockResolvedValue({ data: { data: mockRows } })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(
      () => useClosePreview(1, { periodStart: '2026-06-22', periodEnd: '2026-06-28' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetClosePreview).toHaveBeenCalledWith(1, '2026-06-22', '2026-06-28')
    expect(result.current.data).toHaveLength(1)
    const first = result.current.data?.[0]
    expect(first?.employee.first_name).toBe('Ana')
  })

  it('returns empty array from queryFn when branchId is falsy at call time', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useClosePreview(0, { periodStart: '2026-06-22', periodEnd: '2026-06-28' }),
      { wrapper },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })
})

const mockConfirmCloseResponse = {
  status: 201,
  data: {
    pay_period: {
      id: 'pp-ulid',
      branch_id: 1,
      period_start: '2026-06-22',
      period_end: '2026-06-28',
      status: 'CLOSED',
      closed_at: '2026-06-29T00:00:00+00:00',
    },
    employees_closed: 1,
  },
}

describe('useConfirmClose', () => {
  it('calls payrollApi.confirmClose with the given variables and shows a success toast', async () => {
    mockConfirmClose.mockResolvedValue({ data: mockConfirmCloseResponse })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useConfirmClose(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        branchId: 1,
        periodStart: '2026-06-22',
        periodEnd: '2026-06-28',
      })
    })

    expect(mockConfirmClose).toHaveBeenCalledWith(1, '2026-06-22', '2026-06-28')
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows an error toast with the duplicate-period message on failure', async () => {
    mockConfirmClose.mockRejectedValue(
      createAxiosError('The given data was invalid.', {
        period_start: ['Ya existe un cierre para este periodo.'],
      }),
    )
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useConfirmClose(), { wrapper })

    await act(async () => {
      await expect(
        result.current.mutateAsync({ branchId: 1, periodStart: '2026-06-22', periodEnd: '2026-06-28' }),
      ).rejects.toBeDefined()
    })

    expect(mockShowError).toHaveBeenCalledWith('Ya existe un cierre para este periodo.', 'Error')
  })
})
