// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEmployeeLeaves } from '@/services/leave-hooks'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/leave-api', () => ({
    leaveApi: {
        listLeaveTypes: vi.fn(),
        registerDirectLeave: vi.fn(),
        listEmployeeLeaves: vi.fn(),
    },
}))

import { leaveApi } from '@/services/leave-api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children)
    return { queryClient, wrapper }
}

const mockLeavesResponse = {
    data: {
        data: [
            {
                id: 'leave-001',
                employee_id: 'emp-001',
                leave_type: { id: 1, name: 'Falta injustificada', calculation_mode: 'FULL_DAY' },
                start_date: '2026-04-05',
                end_date: '2026-04-05',
                status: 'APPROVED',
                resolved_pay_percentage: 0,
                resolved_rest_day_factor: 'NONE',
                notes: null,
                requested_by: 'Admin',
            },
            {
                id: 'leave-002',
                employee_id: 'emp-001',
                leave_type: { id: 2, name: 'Permiso con goce', calculation_mode: 'FULL_DAY' },
                start_date: '2026-03-20',
                end_date: '2026-03-21',
                status: 'APPROVED',
                resolved_pay_percentage: 100,
                resolved_rest_day_factor: 'FULL',
                notes: 'Cita médica',
                requested_by: 'Admin',
            },
        ],
        meta: { current_page: 1, last_page: 2, per_page: 15, total: 25 },
    },
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useEmployeeLeaves', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('fetches leaves for an employee', async () => {
        vi.mocked(leaveApi.listEmployeeLeaves).mockResolvedValue(mockLeavesResponse as never)
        const { wrapper } = makeWrapper()

        const { result } = renderHook(() => useEmployeeLeaves('emp-001'), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(leaveApi.listEmployeeLeaves).toHaveBeenCalledWith('emp-001', {})
        expect(result.current.data?.data).toHaveLength(2)
        expect(result.current.data?.meta.total).toBe(25)
    })

    it('passes filters to API', async () => {
        vi.mocked(leaveApi.listEmployeeLeaves).mockResolvedValue(mockLeavesResponse as never)
        const { wrapper } = makeWrapper()
        const filters = { status: 'APPROVED' as const, page: 2 }

        renderHook(() => useEmployeeLeaves('emp-001', filters), { wrapper })

        await waitFor(() =>
            expect(leaveApi.listEmployeeLeaves).toHaveBeenCalledWith('emp-001', filters)
        )
    })

    it('does not fetch when employeeId is empty', async () => {
        const { wrapper } = makeWrapper()

        const { result } = renderHook(() => useEmployeeLeaves(''), { wrapper })

        expect(result.current.fetchStatus).toBe('idle')
        expect(leaveApi.listEmployeeLeaves).not.toHaveBeenCalled()
    })

    it('includes meta with pagination info', async () => {
        vi.mocked(leaveApi.listEmployeeLeaves).mockResolvedValue(mockLeavesResponse as never)
        const { wrapper } = makeWrapper()

        const { result } = renderHook(() => useEmployeeLeaves('emp-001'), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data?.meta).toEqual({
            current_page: 1,
            last_page: 2,
            per_page: 15,
            total: 25,
        })
    })

    it('uses correct query key with filters', async () => {
        vi.mocked(leaveApi.listEmployeeLeaves).mockResolvedValue(mockLeavesResponse as never)
        const { wrapper, queryClient } = makeWrapper()
        const filters = { status: 'PENDING' as const, leave_type_id: 3 }

        const { result } = renderHook(() => useEmployeeLeaves('emp-001', filters), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        const cached = queryClient.getQueryData(['employees', 'emp-001', 'leaves', filters])
        expect(cached).toBeDefined()
    })
})
