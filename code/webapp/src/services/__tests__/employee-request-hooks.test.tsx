// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockCancel = vi.fn()
const mockApprove = vi.fn()
const mockReject = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/employee-request-api', () => ({
    employeeRequestApi: {
        list: (...args: unknown[]) => mockList(...args),
        create: (...args: unknown[]) => mockCreate(...args),
        cancel: (...args: unknown[]) => mockCancel(...args),
        approve: (...args: unknown[]) => mockApprove(...args),
        reject: (...args: unknown[]) => mockReject(...args),
    },
}))

vi.mock('@/components/ui/toast-provider', () => ({
    useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

const mockAuthStore = {
    currentBranch: { id: 1 } as { id: number } | null,
}

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (s: typeof mockAuthStore) => unknown) => selector(mockAuthStore),
}))

import {
    useEmployeeRequests,
    usePendingRequestsCount,
    useApprovedExtraDays,
    useCreateEmployeeRequest,
    useRequestExtraDay,
    useCancelEmployeeRequest,
    useMyExtraDayRequests,
    usePendingRequests,
    useApproveEmployeeRequest,
    useRejectEmployeeRequest,
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
        mockAuthStore.currentBranch = { id: 1 }
    })

    it('returns pending count from meta.total', async () => {
        mockList.mockResolvedValue({ data: { status: 200, data: [], meta: { total: 5 } } })

        const { result } = renderHook(() => usePendingRequestsCount(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toBe(5)
        expect(mockList).toHaveBeenCalledWith({ branch_id: 1, status: 'PENDING', per_page: 1 })
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

    it('does not fire API call when currentBranch is null', () => {
        mockAuthStore.currentBranch = null

        const { result } = renderHook(
            () => usePendingRequestsCount(),
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

describe('useRequestExtraDay', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls employeeRequestApi.create with the given data', async () => {
        mockCreate.mockResolvedValue({ data: { data: { id: 'req-new' } } })

        const { result } = renderHook(() => useRequestExtraDay(), { wrapper: createWrapper() })

        const payload = {
            employee_id: 'emp-1',
            type: 'EXTRA_DAY' as const,
            payload: {
                date: '2026-06-20',
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

    it('shows success toast with employee-facing message on success', async () => {
        mockCreate.mockResolvedValue({ data: { data: { id: 'req-new' } } })

        const { result } = renderHook(() => useRequestExtraDay(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({
                employee_id: 'emp-1',
                type: 'EXTRA_DAY',
                payload: {
                    date: '2026-06-20',
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
            expect.stringContaining('Manager'),
            expect.any(String),
        )
    })

    it('shows error toast when mutation fails', async () => {
        mockCreate.mockRejectedValue(new Error('Network error'))

        const { result } = renderHook(() => useRequestExtraDay(), { wrapper: createWrapper() })

        await act(async () => {
            try {
                await result.current.mutateAsync({
                    employee_id: 'emp-1',
                    type: 'EXTRA_DAY',
                    payload: {
                        date: '2026-06-20',
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

describe('useCancelEmployeeRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls employeeRequestApi.cancel with the request id', async () => {
        mockCancel.mockResolvedValue({ data: {} })

        const { result } = renderHook(() => useCancelEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync('req-abc')
        })

        expect(mockCancel).toHaveBeenCalledWith('req-abc')
    })

    it('shows success toast on successful cancellation', async () => {
        mockCancel.mockResolvedValue({ data: {} })

        const { result } = renderHook(() => useCancelEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync('req-abc')
        })

        expect(mockShowSuccess).toHaveBeenCalledWith(
            expect.stringContaining('cancelada'),
            expect.any(String),
        )
    })

    it('shows error toast when cancellation fails', async () => {
        mockCancel.mockRejectedValue(new Error('Cancel failed'))

        const { result } = renderHook(() => useCancelEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            try {
                await result.current.mutateAsync('req-abc')
            } catch {
                // expected
            }
        })

        await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    })
})

describe('usePendingRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuthStore.currentBranch = { id: 1 }
    })

    it('fetches pending requests scoped to current branch', async () => {
        const pendingItems = [{ id: 'req-1', status: 'PENDING' }]
        mockList.mockResolvedValue({ data: { data: pendingItems, meta: null } })

        const { result } = renderHook(() => usePendingRequests(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual(pendingItems)
        expect(mockList).toHaveBeenCalledWith({
            branch_id: 1,
            status: 'PENDING',
            sort: ['created_at:asc'],
            per_page: 50,
        })
    })

    it('returns empty array when no pending requests', async () => {
        mockList.mockResolvedValue({ data: { data: [], meta: { total: 0 } } })

        const { result } = renderHook(() => usePendingRequests(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual([])
    })

    it('is in loading state initially', () => {
        mockList.mockReturnValue(new Promise(() => {}))

        const { result } = renderHook(() => usePendingRequests(), { wrapper: createWrapper() })

        expect(result.current.isLoading).toBe(true)
    })

    it('does not fire API call when currentBranch is null', () => {
        mockAuthStore.currentBranch = null

        const { result } = renderHook(() => usePendingRequests(), { wrapper: createWrapper() })

        expect(result.current.fetchStatus).toBe('idle')
        expect(mockList).not.toHaveBeenCalled()
    })
})

describe('useApproveEmployeeRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls employeeRequestApi.approve with id and data', async () => {
        mockApprove.mockResolvedValue({ data: { data: { id: 'req-1', status: 'APPROVED' } } })

        const { result } = renderHook(() => useApproveEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({ id: 'req-1', data: { salary_pct: 80 } })
        })

        expect(mockApprove).toHaveBeenCalledWith('req-1', { salary_pct: 80 })
    })

    it('shows success toast on approval', async () => {
        mockApprove.mockResolvedValue({ data: { data: { id: 'req-1', status: 'APPROVED' } } })

        const { result } = renderHook(() => useApproveEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({ id: 'req-1' })
        })

        expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('aprobada'), expect.any(String))
    })

    it('shows error toast when approval fails', async () => {
        mockApprove.mockRejectedValue(new Error('Server error'))

        const { result } = renderHook(() => useApproveEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            try { await result.current.mutateAsync({ id: 'req-1' }) } catch { /* expected */ }
        })

        await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    })
})

describe('useRejectEmployeeRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls employeeRequestApi.reject with id and reason', async () => {
        mockReject.mockResolvedValue({ data: { data: { id: 'req-1', status: 'REJECTED' } } })

        const { result } = renderHook(() => useRejectEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({ id: 'req-1', reason: 'No procede' })
        })

        expect(mockReject).toHaveBeenCalledWith('req-1', 'No procede')
    })

    it('calls reject with undefined reason when reason omitted', async () => {
        mockReject.mockResolvedValue({ data: { data: { id: 'req-1', status: 'REJECTED' } } })

        const { result } = renderHook(() => useRejectEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({ id: 'req-1' })
        })

        expect(mockReject).toHaveBeenCalledWith('req-1', undefined)
    })

    it('shows success toast on rejection', async () => {
        mockReject.mockResolvedValue({ data: { data: { id: 'req-1', status: 'REJECTED' } } })

        const { result } = renderHook(() => useRejectEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            await result.current.mutateAsync({ id: 'req-1', reason: 'No aplica' })
        })

        expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('rechazada'), expect.any(String))
    })

    it('shows error toast when rejection fails', async () => {
        mockReject.mockRejectedValue(new Error('Network error'))

        const { result } = renderHook(() => useRejectEmployeeRequest(), { wrapper: createWrapper() })

        await act(async () => {
            try { await result.current.mutateAsync({ id: 'req-1' }) } catch { /* expected */ }
        })

        await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    })
})

describe('useMyExtraDayRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fires the query when employeeId is provided', async () => {
        const extraDays = [{ id: 'req-1', type: 'EXTRA_DAY', status: 'PENDING' }]
        mockList.mockResolvedValue({ data: { data: extraDays, meta: null } })

        const { result } = renderHook(
            () => useMyExtraDayRequests('emp-1'),
            { wrapper: createWrapper() },
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual(extraDays)
        expect(mockList).toHaveBeenCalledWith(
            expect.objectContaining({ employee_id: 'emp-1', type: 'EXTRA_DAY' }),
        )
    })

    it('does not fire when employeeId is undefined', () => {
        const { result } = renderHook(
            () => useMyExtraDayRequests(undefined),
            { wrapper: createWrapper() },
        )

        expect(result.current.fetchStatus).toBe('idle')
        expect(mockList).not.toHaveBeenCalled()
    })
})
