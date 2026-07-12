import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'
import { auditApi, AUDITABLE_TYPE_ATTENDANCE, AUDITABLE_TYPE_EMPLOYEE } from '../audit.service'

describe('auditApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /audit-logs without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await auditApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /audit-logs filtered by record', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { total: 1 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await auditApi.list({ auditable_type: AUDITABLE_TYPE_ATTENDANCE, auditable_id: 'att-1' })

            expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', {
                params: { auditable_type: AUDITABLE_TYPE_ATTENDANCE, auditable_id: 'att-1' },
            })
        })

        it('calls GET /audit-logs filtered by employee and date range', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { total: 2 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await auditApi.list({ employee_id: 'emp-1', date_from: '2026-06-01', date_to: '2026-06-30' })

            expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', {
                params: { employee_id: 'emp-1', date_from: '2026-06-01', date_to: '2026-06-30' },
            })
        })

        it('exposes the Employee auditable type constant', () => {
            expect(AUDITABLE_TYPE_EMPLOYEE).toBe('App\\Models\\Employee')
        })
    })
})
