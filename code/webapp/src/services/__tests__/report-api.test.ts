import { describe, it, expect, vi, beforeEach } from 'vitest'
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
