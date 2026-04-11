// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLeaveSummarySection } from '@/components/employees/use-leave-summary-section'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/services/leave-api', () => ({
    leaveApi: {
        listEmployeeLeaves: vi.fn(),
        listLeaveTypes: vi.fn(),
    },
}))

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

import { leaveApi } from '@/services/leave-api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    return ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const employee = { id: 'emp-1', first_name: 'Ana', last_name: 'López', code: 'E001' }

function makeLeave(overrides: Record<string, unknown> = {}) {
    return {
        id: 'leave-1',
        employee_id: 'emp-1',
        leave_type: { id: 1, name: 'Incapacidad', code: 'MEDICAL', calculation_mode: 'FULL_DAY' },
        start_date: '2026-04-01',
        end_date: '2026-04-01',
        status: 'APPROVED',
        resolved_pay_percentage: 0,
        resolved_rest_day_factor: 'NONE',
        notes: null,
        requested_by: 'Admin',
        ...overrides,
    }
}

const emptyResponse = {
    data: { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
}

const leaveTypesResponse = {
    data: {
        data: [
            { id: 1, code: 'MEDICAL', name: 'Incapacidad', calculation_mode: 'FULL_DAY', default_pay_percentage: 0, default_rest_day_factor: 'NONE', counts_for_bonus: false },
            { id: 2, code: 'PERSONAL', name: 'Falta personal', calculation_mode: 'FULL_DAY', default_pay_percentage: 0, default_rest_day_factor: 'NONE', counts_for_bonus: false },
        ],
    },
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useLeaveSummarySection', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(leaveApi.listEmployeeLeaves).mockResolvedValue(emptyResponse as never)
        vi.mocked(leaveApi.listLeaveTypes).mockResolvedValue(leaveTypesResponse as never)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns empty monthlySummary when no leaves exist', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        await waitFor(() => expect(result.current.isLoadingSummary).toBe(false))

        expect(result.current.monthlySummary).toEqual([])
        expect(result.current.recentLeaves).toEqual([])
    })

    it('groups monthly leaves by type code', async () => {
        const leavesData = [
            makeLeave({ id: 'l1', leave_type: { id: 1, name: 'Incapacidad', code: 'MEDICAL', calculation_mode: 'FULL_DAY' } }),
            makeLeave({ id: 'l2', leave_type: { id: 1, name: 'Incapacidad', code: 'MEDICAL', calculation_mode: 'FULL_DAY' } }),
            makeLeave({ id: 'l3', leave_type: { id: 2, name: 'Personal', code: 'PERSONAL', calculation_mode: 'FULL_DAY' } }),
        ]

        // Summary query returns leaves (first call with overlap_from/overlap_to), recent returns leaves (second call with per_page:3)
        vi.mocked(leaveApi.listEmployeeLeaves).mockResolvedValue({
            data: { data: leavesData, meta: { current_page: 1, last_page: 1, per_page: 100, total: 3 } },
        } as never)

        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        await waitFor(() => expect(result.current.monthlySummary.length).toBeGreaterThan(0))

        const medical = result.current.monthlySummary.find((s) => s.code === 'MEDICAL')
        const personal = result.current.monthlySummary.find((s) => s.code === 'PERSONAL')
        expect(medical?.count).toBe(2)
        expect(personal?.count).toBe(1)
    })

    it('showFullHistory toggles on/off', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        expect(result.current.showFullHistory).toBe(false)

        act(() => result.current.openFullHistory())
        expect(result.current.showFullHistory).toBe(true)

        act(() => result.current.closeFullHistory())
        expect(result.current.showFullHistory).toBe(false)
    })

    it('closeFullHistory resets filters and page', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        act(() => {
            result.current.openFullHistory()
            result.current.updateFilter('status', 'APPROVED')
            result.current.setPage(3)
        })

        expect(result.current.filters).toEqual({ status: 'APPROVED' })
        expect(result.current.page).toBe(3)

        act(() => result.current.closeFullHistory())

        expect(result.current.filters).toEqual({})
        expect(result.current.page).toBe(1)
    })

    it('updateFilter sets filter and resets page to 1', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        act(() => result.current.setPage(5))
        expect(result.current.page).toBe(5)

        act(() => result.current.updateFilter('status', 'PENDING'))
        expect(result.current.page).toBe(1)
        expect(result.current.filters).toEqual({ status: 'PENDING' })
    })

    it('updateFilter removes key when value is empty', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        act(() => result.current.updateFilter('status', 'APPROVED'))
        expect(result.current.filters).toEqual({ status: 'APPROVED' })

        act(() => result.current.updateFilter('status', ''))
        expect(result.current.filters).toEqual({})
    })

    it('openRegisterLeave sets pendingLeaveEmployee from employee', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        expect(result.current.pendingLeaveEmployee).toBeNull()

        act(() => result.current.openRegisterLeave())

        expect(result.current.pendingLeaveEmployee).toEqual({
            id: 'emp-1',
            code: 'E001',
            first_name: 'Ana',
            last_name: 'López',
            roles: [],
        })
    })

    it('openRegisterLeave does nothing when employee is undefined', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', undefined),
            { wrapper: createWrapper() },
        )

        act(() => result.current.openRegisterLeave())

        expect(result.current.pendingLeaveEmployee).toBeNull()
    })

    it('closeRegisterLeave clears pendingLeaveEmployee', async () => {
        const { result } = renderHook(
            () => useLeaveSummarySection('emp-1', employee),
            { wrapper: createWrapper() },
        )

        act(() => result.current.openRegisterLeave())
        expect(result.current.pendingLeaveEmployee).not.toBeNull()

        act(() => result.current.closeRegisterLeave())
        expect(result.current.pendingLeaveEmployee).toBeNull()
    })
})
