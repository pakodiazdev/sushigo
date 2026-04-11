import { describe, it, expect, vi, beforeEach } from 'vitest'
import { leaveApi } from '../leave-api'

// ── Mock ───────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('leaveApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('listLeaveTypes', () => {
        it('calls GET /leave-types', async () => {
            const mockResponse = { data: { status: 200, data: [] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await leaveApi.listLeaveTypes()

            expect(apiClient.get).toHaveBeenCalledWith('/leave-types')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('registerDirectLeave', () => {
        it('calls POST /leaves with correct payload', async () => {
            const mockResponse = { data: { status: 201, data: {} } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const payload = {
                employee_id: '01HZTEST00000001',
                leave_type_id: 1,
                start_date: '2026-04-09',
                end_date: '2026-04-09',
                pay_percentage: null,
                time_mode: null,
                scheduled_start_time: null,
                scheduled_end_time: null,
                notes: 'Cita médica',
            }

            const result = await leaveApi.registerDirectLeave(payload)

            expect(apiClient.post).toHaveBeenCalledWith('/leaves', payload)
            expect(result).toEqual(mockResponse)
        })

        it('sends optional fields when provided', async () => {
            const mockResponse = { data: { status: 201, data: {} } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const payload = {
                employee_id: '01HZTEST00000001',
                leave_type_id: 4,
                start_date: '2026-04-09',
                end_date: '2026-04-09',
                pay_percentage: 50,
                time_mode: 'SCHEDULED' as const,
                scheduled_start_time: '10:00',
                scheduled_end_time: '12:00',
                notes: null,
            }

            await leaveApi.registerDirectLeave(payload)

            expect(apiClient.post).toHaveBeenCalledWith('/leaves', payload)
        })
    })

    describe('listEmployeeLeaves', () => {
        it('calls GET /employees/{id}/leaves without filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await leaveApi.listEmployeeLeaves('emp-001')

            expect(apiClient.get).toHaveBeenCalledWith('/employees/emp-001/leaves')
            expect(result).toEqual(mockResponse)
        })

        it('appends query params when filters are provided', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await leaveApi.listEmployeeLeaves('emp-001', {
                status: 'APPROVED',
                date_from: '2026-01-01',
                date_to: '2026-03-31',
                leave_type_id: 2,
                per_page: 10,
                page: 2,
            })

            const calledUrl = vi.mocked(apiClient.get).mock.calls[0]![0]
            expect(calledUrl).toContain('/employees/emp-001/leaves?')
            expect(calledUrl).toContain('status=APPROVED')
            expect(calledUrl).toContain('date_from=2026-01-01')
            expect(calledUrl).toContain('date_to=2026-03-31')
            expect(calledUrl).toContain('leave_type_id=2')
            expect(calledUrl).toContain('per_page=10')
            expect(calledUrl).toContain('page=2')
        })

        it('appends overlap query params when provided', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await leaveApi.listEmployeeLeaves('emp-001', {
                overlap_from: '2026-04-01',
                overlap_to: '2026-04-30',
                per_page: 100,
            })

            const calledUrl = vi.mocked(apiClient.get).mock.calls[0]![0]
            expect(calledUrl).toContain('/employees/emp-001/leaves?')
            expect(calledUrl).toContain('overlap_from=2026-04-01')
            expect(calledUrl).toContain('overlap_to=2026-04-30')
            expect(calledUrl).toContain('per_page=100')
        })

        it('omits empty filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await leaveApi.listEmployeeLeaves('emp-001', { status: 'PENDING' })

            const calledUrl = vi.mocked(apiClient.get).mock.calls[0]![0]
            expect(calledUrl).toContain('status=PENDING')
            expect(calledUrl).not.toContain('date_from')
            expect(calledUrl).not.toContain('leave_type_id')
        })
    })
})
