// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
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
const mockGetPayPeriods = vi.fn()
const mockGetPayPeriodDetail = vi.fn()
const mockExportCsv = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/payroll.service', () => ({
  payrollApi: {
    getClosePreview: (...args: unknown[]) => mockGetClosePreview(...args),
    confirmClose: (...args: unknown[]) => mockConfirmClose(...args),
    getPayPeriods: (...args: unknown[]) => mockGetPayPeriods(...args),
    getPayPeriodDetail: (...args: unknown[]) => mockGetPayPeriodDetail(...args),
    exportCsv: (...args: unknown[]) => mockExportCsv(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import {
  useClosePreview,
  useConfirmClose,
  usePayPeriods,
  usePayPeriodDetail,
  useExportPayPeriod,
} from '../payroll-hooks'

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

  it('invalidates both the preview and periods-list caches on success', async () => {
    mockConfirmClose.mockResolvedValue({ data: mockConfirmCloseResponse })
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useConfirmClose(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        branchId: 1,
        periodStart: '2026-06-22',
        periodEnd: '2026-06-28',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['payroll', 'preview'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['payroll', 'periods'] })
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

const mockPeriodListItem = {
  id: 'pp-ulid-1',
  branch_id: 1,
  period_start: '2026-06-22',
  period_end: '2026-06-28',
  status: 'CLOSED',
  closed_by: 'Ana García',
  closed_at: '2026-06-29T00:00:00+00:00',
  reopened_by: null,
  reopened_at: null,
  reopen_reason: null,
  total_employees: 3,
}

describe('usePayPeriods', () => {
  it('is disabled when branch_id is not provided', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePayPeriods({}), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetPayPeriods).not.toHaveBeenCalled()
  })

  it('fetches the paginated list when branch_id is provided', async () => {
    mockGetPayPeriods.mockResolvedValue({
      data: {
        status: 200,
        data: [mockPeriodListItem],
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      },
    })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePayPeriods({ branch_id: 1, status: 'CLOSED' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetPayPeriods).toHaveBeenCalledWith({ branch_id: 1, status: 'CLOSED' })
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.meta.total).toBe(1)
  })
})

describe('usePayPeriodDetail', () => {
  it('is disabled when periodId is null', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePayPeriodDetail(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetPayPeriodDetail).not.toHaveBeenCalled()
  })

  it('fetches the period detail when periodId is provided', async () => {
    mockGetPayPeriodDetail.mockResolvedValue({
      data: { status: 200, data: { ...mockPeriodListItem, employees: [mockRows[0]] } },
    })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePayPeriodDetail('pp-ulid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetPayPeriodDetail).toHaveBeenCalledWith('pp-ulid-1')
    expect(result.current.data?.employees).toHaveLength(1)
    expect(result.current.data?.status).toBe('CLOSED')
  })
})

describe('useExportPayPeriod', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('downloads the CSV blob and shows a success toast', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' })
    mockExportCsv.mockResolvedValue({
      data: mockBlob,
      headers: { 'content-disposition': 'attachment; filename="periodo-nomina-2026-06-22-2026-06-28.csv"' },
    })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExportPayPeriod(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('pp-ulid-1')
    })

    expect(mockExportCsv).toHaveBeenCalledWith('pp-ulid-1')
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('shows an error toast on failure', async () => {
    mockExportCsv.mockRejectedValue(createAxiosError('Export failed', undefined, 500))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useExportPayPeriod(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync('pp-ulid-1')).rejects.toBeDefined()
    })

    expect(mockShowError).toHaveBeenCalled()
  })
})
