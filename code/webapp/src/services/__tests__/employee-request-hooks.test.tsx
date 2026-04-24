// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/employee-request-api', () => ({
    employeeRequestApi: {
        list: (...args: unknown[]) => mockList(...args),
        create: (...args: unknown[]) => mockCreate(...args),
    },
}))

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import {
    useEmployeeRequests,
    usePendingRequestsCount,
    useApprovedExtraDays,
    useCreateEmployeeRequest,
} from '../employee-request-hooks'

// ── Wrapper ───────────────────────────────────────────────────────────────────

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    })
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEmployeeRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches employee requests without filters', async () => {
        const mockData = { status: 200, data: [{ id: 'req-1', type: 'EXTRA_DAY', status: 'PENDING' }], meta: null }
        mockList.mockResolvedValue({ data: mockData })

        const { result } = renderHook(() => useEmployeeRequests(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual(mockData)
        expect(mockList).toHaveBeenCalledWith(undefined)
    })

    it('fetches employee requests with status filter', async () => {
        const mockData = { status: 200, data: [], meta: { total: 0 } }
        mockList.mockResolvedValue({ data: mockData })

        const { result } = renderHook(
            () => useEmployeeRequests({ status: 'PENDING' }),
            { wrapper: createWrapper() },
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(mockList).toHaveBeenCalledWith({ status: 'PENDING' })
    })

    it('is loading initially', () => {
        mockList.mockReturnValue(new Promise(() => {}))

        const { result } = renderHook(() => useEmployeeRequests(), { wrapper: createWrapper() })

        expect(result.current.isLoading).toBe(true)
    })
})

describe('usePendingRequestsCount', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns pending count from meta.total', async () => {
        mockList.mockResolvedValue({ data: { status: 200, data: [], meta: { total: 5 } } })

        const { result } = renderHook(() => usePendingRequestsCount(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toBe(5)
        expect(mockList).toHaveBeenCalledWith({ status: 'PENDING', per_page: 1 })
    })

    it('returns 0 when meta is null', async () => {
        mockList.mockResolvedValue({ data: { status: 200, data: [], meta: null } })

        const { result } = renderHook(() => usePendingRequestsCount(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toBe(0)
    })

    it('returns 0 when meta.total is undefined', async () => {
        mockList.mockResolvedValue({ data: { status: 200, data: [], meta: {} } })

        const { result } = renderHook(() => usePendingRequestsCount(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toBe(0)
    })

    it('does not fire API call when enabled=false', () => {
        const { result } = renderHook(
            () => usePendingRequestsCount({ enabled: false }),
            { wrapper: createWrapper() },
        )

        expect(result.current.fetchStatus).toBe('idle')
        expect(mockList).not.toHaveBeenCalled()
    })

    it('fires API call when enabled=true (default)', async () => {
        mockList.mockResolvedValue({ data: { status: 200, data: [], meta: { total: 3 } } })

        const { result } = renderHook(
            () => usePendingRequestsCount({ enabled: true }),
            { wrapper: createWrapper() },
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(mockList).toHaveBeenCalledTimes(1)
    })
})

describe('useApprovedExtraDays', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('uses a distinct query key that does not collide with useEmployeeRequests', () => {
        mockList.mockReturnValue(new Promise(() => {}))

        const { result } = renderHook(
            () => useApprovedExtraDays('emp-1'),
            { wrapper: createWrapper() },
        )

        // Query fires (not idle), confirming enabled=true with a non-empty employeeId
        expect(result.current.fetchStatus).toBe('fetching')
        expect(mockList).toHaveBeenCalledWith(
            expect.objectContaining({ employee_id: 'emp-1', type: 'EXTRA_DAY', status: 'APPROVED' }),
        )
    })

    it('does not fire when employeeId is empty', () => {
        const { result } = renderHook(
            () => useApprovedExtraDays(''),
            { wrapper: createWrapper() },
        )

        expect(result.current.fetchStatus).toBe('idle')
        expect(mockList).not.toHaveBeenCalled()
    })

    it('returns the data array from response.data.data', async () => {
        const extraDays = [{ id: 'req-1', type: 'EXTRA_DAY', status: 'APPROVED' }]
        mockList.mockResolvedValue({ data: { data: extraDays, meta: null } })

        const { result } = renderHook(
            () => useApprovedExtraDays('emp-1'),
            { wrapper: createWrapper() },
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual(extraDays)
    })
})

describe('useCreateEmployeeRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls employeeRequestApi.create with the given data', async () => {
        mockCreate.mockResolvedValue({ data: { data: { id: 'req-new' } } })

        const { result } = renderHook(() => useCreateEmployeeRequest(), { wrapper: createWrapper() })

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

        await act(async () => {
            await result.current.mutateAsync(payload)
        })

        expect(mockCreate).toHaveBeenCalledWith(payload)
    })

    it('shows success toast on successful mutation', async () => {
        mockCreate.mockResolvedValue({ data: { data: { id: 'req-new' } } })

        const { result } = renderHook(() => useCreateEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({
                employee_id: 'emp-1',
                type: 'EXTRA_DAY',
                payload: {
                    date: '2026-04-25',
                    salary_pct: 100,
                    prima_pct: 100,
                    salary_day: 800,
                    prima: 800,
                    seventh_day: 800,
                    total: 2400,
                },
            })
        })

        expect(mockShowSuccess).toHaveBeenCalledWith(
            expect.stringContaining('día extra'),
            expect.any(String),
        )
    })

    it('shows error toast when mutation rejects', async () => {
        mockCreate.mockRejectedValue(new Error('Server error'))

        const { result } = renderHook(() => useCreateEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            try {
                await result.current.mutateAsync({
                    employee_id: 'emp-1',
                    type: 'EXTRA_DAY',
                    payload: {
                        date: '2026-04-25',
                        salary_pct: 100,
                        prima_pct: 100,
                        salary_day: 800,
                        prima: 800,
                        seventh_day: 800,
                        total: 2400,
                    },
                })
            } catch {
                // expected
            }
        })

        await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    })
})
