import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
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

    describe('approve', () => {
        it('calls PATCH /employee-requests/:id/approve with override data', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'req-1', status: 'APPROVED' } } }
            vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

            const result = await employeeRequestApi.approve('req-1', { salary_pct: 80, salary_day: 160 })

            expect(apiClient.patch).toHaveBeenCalledWith('/employee-requests/req-1/approve', { salary_pct: 80, salary_day: 160 })
            expect(result).toEqual(mockResponse)
        })

        it('sends empty object when no data provided', async () => {
            vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

            await employeeRequestApi.approve('req-1')

            expect(apiClient.patch).toHaveBeenCalledWith('/employee-requests/req-1/approve', {})
        })
    })

    describe('reject', () => {
        it('calls PATCH /employee-requests/:id/reject with reason', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'req-1', status: 'REJECTED' } } }
            vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

            const result = await employeeRequestApi.reject('req-1', 'No procede')

            expect(apiClient.patch).toHaveBeenCalledWith('/employee-requests/req-1/reject', { reason: 'No procede' })
            expect(result).toEqual(mockResponse)
        })

        it('calls PATCH /employee-requests/:id/reject with undefined reason when not provided', async () => {
            vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

            await employeeRequestApi.reject('req-1')

            expect(apiClient.patch).toHaveBeenCalledWith('/employee-requests/req-1/reject', { reason: undefined })
        })
    })

    describe('create', () => {
        it('calls POST /employee-requests with the given data', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'req-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const payload = {
                employee_id: 'emp-1',
                type: 'EXTRA_DAY' as const,
                auto_approve: true,
                payload: {
                    date: '2026-04-25',
                    salary_pct: 100,
                    prima_pct: 100,
                    salary_day: 800,
                    prima: 800,
                    seventh_day: 800,
                    total: 2400,
                },
            }

            const result = await employeeRequestApi.create(payload)

            expect(apiClient.post).toHaveBeenCalledWith('/employee-requests', payload)
            expect(result).toEqual(mockResponse)
        })
    })
})
