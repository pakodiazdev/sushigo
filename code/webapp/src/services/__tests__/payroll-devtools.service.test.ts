import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedPayrollAttendance } from '@/services/payroll-devtools.service'

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        post: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'

describe('seedPayrollAttendance', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls POST /devtools/payroll/seed with given params and returns data', async () => {
        const mockResult = { created: 5, deleted: 0, employees: ['EMP-001'] }
        vi.mocked(apiClient.post).mockResolvedValueOnce({
            data: { status: 'ok', data: mockResult },
        } as never)

        const result = await seedPayrollAttendance({
            branch_id: 1,
            period_start: '2026-06-23',
            period_end: '2026-06-29',
            scenario: 'full_week',
        })

        expect(apiClient.post).toHaveBeenCalledWith('/devtools/payroll/seed', {
            branch_id: 1,
            period_start: '2026-06-23',
            period_end: '2026-06-29',
            scenario: 'full_week',
        })
        expect(result).toEqual(mockResult)
    })
})
