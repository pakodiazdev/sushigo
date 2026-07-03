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
