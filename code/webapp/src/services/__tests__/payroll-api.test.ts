// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

import { payrollApi } from '../payroll.service'

afterEach(() => {
  vi.clearAllMocks()
})

const mockPreviewData = {
  status: 200,
  data: [
    {
      employee: { id: 'emp-ulid', first_name: 'Juan', last_name: 'García', code: 'EMP-001' },
      base_pay: 4800.0,
      late_deductions: 0.0,
      unpaid_leave_deductions: 0.0,
      overtime_pay: 0.0,
      extra_day_pay: 0.0,
      punctuality_bonus: 150.0,
      holiday_pay: 0.0,
      other_adjustments: 0.0,
      total_pay: 4950.0,
      free_hours_earned: 0.0,
      pay_period_lines: [],
    },
  ],
}

describe('payrollApi.getClosePreview', () => {
  it('calls GET /pay-periods/preview with correct params', async () => {
    mockGet.mockResolvedValue({ data: mockPreviewData })

    await payrollApi.getClosePreview(1, '2026-06-22', '2026-06-28')

    expect(mockGet).toHaveBeenCalledWith('/pay-periods/preview', {
      params: { branch_id: 1, period_start: '2026-06-22', period_end: '2026-06-28' },
    })
  })

  it('returns the full response data', async () => {
    mockGet.mockResolvedValue({ data: mockPreviewData })

    const result = await payrollApi.getClosePreview(1, '2026-06-22', '2026-06-28')

    expect(result.data.data).toHaveLength(1)
    const first = result.data.data[0]
    expect(first?.total_pay).toBe(4950.0)
  })
})

const mockConfirmCloseData = {
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

describe('payrollApi.confirmClose', () => {
  it('calls POST /pay-periods with correct body', async () => {
    mockPost.mockResolvedValue({ data: mockConfirmCloseData })

    await payrollApi.confirmClose(1, '2026-06-22', '2026-06-28')

    expect(mockPost).toHaveBeenCalledWith('/pay-periods', {
      branch_id: 1,
      period_start: '2026-06-22',
      period_end: '2026-06-28',
    })
  })

  it('returns the full response data', async () => {
    mockPost.mockResolvedValue({ data: mockConfirmCloseData })

    const result = await payrollApi.confirmClose(1, '2026-06-22', '2026-06-28')

    expect(result.data.data.pay_period.status).toBe('CLOSED')
    expect(result.data.data.employees_closed).toBe(1)
  })
})

const mockListData = {
  status: 200,
  data: [
    {
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
    },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
}

describe('payrollApi.getPayPeriods', () => {
  it('calls GET /pay-periods with the given filters', async () => {
    mockGet.mockResolvedValue({ data: mockListData })

    await payrollApi.getPayPeriods({ branch_id: 1, status: 'CLOSED' })

    expect(mockGet).toHaveBeenCalledWith('/pay-periods', {
      params: { branch_id: 1, status: 'CLOSED' },
    })
  })

  it('returns the full response data', async () => {
    mockGet.mockResolvedValue({ data: mockListData })

    const result = await payrollApi.getPayPeriods({ branch_id: 1 })

    expect(result.data.data).toHaveLength(1)
    expect(result.data.meta.total).toBe(1)
  })
})

const mockDetailData = {
  status: 200,
  data: {
    ...mockListData.data[0],
    employees: [],
  },
}

describe('payrollApi.getPayPeriodDetail', () => {
  it('calls GET /pay-periods/:id', async () => {
    mockGet.mockResolvedValue({ data: mockDetailData })

    await payrollApi.getPayPeriodDetail('pp-ulid-1')

    expect(mockGet).toHaveBeenCalledWith('/pay-periods/pp-ulid-1')
  })

  it('returns the full response data', async () => {
    mockGet.mockResolvedValue({ data: mockDetailData })

    const result = await payrollApi.getPayPeriodDetail('pp-ulid-1')

    expect(result.data.data.status).toBe('CLOSED')
    expect(result.data.data.employees).toEqual([])
  })
})
