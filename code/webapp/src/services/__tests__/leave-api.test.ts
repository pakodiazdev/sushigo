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
})
