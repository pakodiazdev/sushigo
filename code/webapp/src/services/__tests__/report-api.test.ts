import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WeeklySummaryResponse } from '@/types/report'
import { reportApi } from '@/services/report.service'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import { apiClient } from '@/lib/api-client'

// ── reportApi.getToday ─────────────────────────────────────────────────────────

describe('reportApi.getToday', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /reports/today with branch_id param', async () => {
    const mockResponse = {
      data: {
        status: 200,
        data: {
          summary: {
            total_employees: 3,
            arrived: 2,
            not_arrived: 1,
            late_count: 1,
          },
          employees: [
            {
              employee_id: 'emp-001',
              name: 'Carlos Mendoza',
              code: 'EMP-001',
              role: 'cook',
              status: 'arrived',
              check_in_time: '2026-06-14T09:00:00Z',
              late_minutes: null,
              has_overtime: false,
              overtime_authorized: false,
            },
          ],
        },
      },
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse as never)

    const result = await reportApi.getToday(5)

    expect(apiClient.get).toHaveBeenCalledWith('/reports/today', {
      params: { branch_id: 5 },
    })
    expect(result).toEqual(mockResponse)
  })

  it('passes different branch_id values correctly', async () => {
    await reportApi.getToday(10)
    expect(apiClient.get).toHaveBeenCalledWith('/reports/today', {
      params: { branch_id: 10 },
    })

    vi.clearAllMocks()

    await reportApi.getToday(1)
    expect(apiClient.get).toHaveBeenCalledWith('/reports/today', {
      params: { branch_id: 1 },
    })
  })
})

// ── reportApi.getWeeklySummary ─────────────────────────────────────────────────

const mockWeeklySummary: WeeklySummaryResponse = {
  employee_id: 'emp-ulid-001',
  period_start: '2026-06-16',
  period_end: '2026-06-22',
  base_pay: 1120.0,
  late_deductions: 20.0,
  unpaid_leave_deductions: 0.0,
  overtime_pay: 0.0,
  extra_day_pay: 0.0,
  holiday_pay: 0.0,
  punctuality_bonus: 110.0,
  free_hours_earned: 1.0,
  total_pay: 1210.0,
  daily_evidence: [],
}

describe('reportApi.getWeeklySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /reports/weekly-summary with correct params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { status: 200, data: mockWeeklySummary },
    } as never)

    const result = await reportApi.getWeeklySummary('emp-ulid-001', '2026-06-16', '2026-06-22')

    expect(apiClient.get).toHaveBeenCalledWith('/reports/weekly-summary', {
      params: {
        employee_id: 'emp-ulid-001',
        period_start: '2026-06-16',
        period_end: '2026-06-22',
      },
    })
    expect(result).toEqual({ data: { status: 200, data: mockWeeklySummary } })
  })

  it('passes different employee ids and date ranges', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} } as never)

    await reportApi.getWeeklySummary('emp-ulid-002', '2026-06-09', '2026-06-15')

    expect(apiClient.get).toHaveBeenCalledWith('/reports/weekly-summary', {
      params: {
        employee_id: 'emp-ulid-002',
        period_start: '2026-06-09',
        period_end: '2026-06-15',
      },
    })
  })
})
