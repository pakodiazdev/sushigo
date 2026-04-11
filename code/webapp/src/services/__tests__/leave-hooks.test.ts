// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEmployeeLeaves, useLeaveActions, useRegisterLeaveRequest } from '@/services/leave-hooks'

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
        registerLeaveRequest: vi.fn(),
        approveLeave: vi.fn(),
        rejectLeave: vi.fn(),
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

// ── useRegisterLeaveRequest ─────────────────────────────────────────────────

describe('useRegisterLeaveRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls registerLeaveRequest API and shows success toast', async () => {
        const mockResponse = { data: { status: 201, data: { id: 'leave-new', status: 'PENDING' } } }
        vi.mocked(leaveApi.registerLeaveRequest).mockResolvedValue(mockResponse as never)

        const { wrapper, queryClient } = makeWrapper()
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useRegisterLeaveRequest(), { wrapper })

        result.current.mutate({
            employee_id: 'emp-001',
            leave_type_id: 1,
            start_date: '2026-04-15',
            end_date: '2026-04-15',
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(leaveApi.registerLeaveRequest).toHaveBeenCalledOnce()
        expect(mockShowSuccess).toHaveBeenCalledWith(
            'Solicitud de ausencia creada. Pendiente de aprobación.',
            'Solicitud'
        )
        expect(invalidateSpy).toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
        vi.mocked(leaveApi.registerLeaveRequest).mockRejectedValue(new Error('Server error'))

        const { wrapper } = makeWrapper()
        const { result } = renderHook(() => useRegisterLeaveRequest(), { wrapper })

        result.current.mutate({
            employee_id: 'emp-001',
            leave_type_id: 1,
            start_date: '2026-04-15',
            end_date: '2026-04-15',
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(mockShowError).toHaveBeenCalled()
    })
})

// ── useLeaveActions ─────────────────────────────────────────────────────────

describe('useLeaveActions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('approve calls approveLeave API and invalidates queries', async () => {
        const mockResponse = { data: { status: 200, data: { id: 'leave-001', status: 'APPROVED' } } }
        vi.mocked(leaveApi.approveLeave).mockResolvedValue(mockResponse as never)

        const { wrapper, queryClient } = makeWrapper()
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useLeaveActions('emp-001'), { wrapper })

        result.current.approve('leave-001')

        await waitFor(() => expect(leaveApi.approveLeave).toHaveBeenCalledWith('leave-001'))
        expect(mockShowSuccess).toHaveBeenCalledWith('Ausencia aprobada correctamente.', 'Aprobación')
        expect(invalidateSpy).toHaveBeenCalled()
    })

    it('reject calls rejectLeave API and invalidates queries', async () => {
        const mockResponse = { data: { status: 200, data: { id: 'leave-001', status: 'REJECTED' } } }
        vi.mocked(leaveApi.rejectLeave).mockResolvedValue(mockResponse as never)

        const { wrapper, queryClient } = makeWrapper()
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useLeaveActions('emp-001'), { wrapper })

        result.current.reject('leave-001')

        await waitFor(() => expect(leaveApi.rejectLeave).toHaveBeenCalledWith('leave-001'))
        expect(mockShowSuccess).toHaveBeenCalledWith('Ausencia rechazada.', 'Rechazo')
        expect(invalidateSpy).toHaveBeenCalled()
    })

    it('approve shows error toast on failure', async () => {
        vi.mocked(leaveApi.approveLeave).mockRejectedValue(new Error('Fail'))

        const { wrapper } = makeWrapper()
        const { result } = renderHook(() => useLeaveActions('emp-001'), { wrapper })

        result.current.approve('leave-001')

        await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    })

    it('reject shows error toast on failure', async () => {
        vi.mocked(leaveApi.rejectLeave).mockRejectedValue(new Error('Fail'))

        const { wrapper } = makeWrapper()
        const { result } = renderHook(() => useLeaveActions('emp-001'), { wrapper })

        result.current.reject('leave-001')

        await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    })
})
