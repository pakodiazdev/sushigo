import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'
import { employeeRequestApi } from '../employee-request-api'

describe('employeeRequestApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /employee-requests without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeRequestApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/employee-requests', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /employee-requests with status filter', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { total: 3 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await employeeRequestApi.list({ status: 'PENDING' })

            expect(apiClient.get).toHaveBeenCalledWith('/employee-requests', { params: { status: 'PENDING' } })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /employee-requests with employee_id filter', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await employeeRequestApi.list({ employee_id: 'emp-123', type: 'EXTRA_DAY' })

            expect(apiClient.get).toHaveBeenCalledWith('/employee-requests', {
                params: { employee_id: 'emp-123', type: 'EXTRA_DAY' },
            })
        })

        it('calls GET /employee-requests with per_page filter', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { total: 0 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await employeeRequestApi.list({ per_page: 1 })

            expect(apiClient.get).toHaveBeenCalledWith('/employee-requests', { params: { per_page: 1 } })
        })
    })
})
