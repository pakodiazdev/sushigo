// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn()

vi.mock('@/services/employee-request-api', () => ({
    employeeRequestApi: {
        list: (...args: unknown[]) => mockList(...args),
    },
}))

import { useEmployeeRequests, usePendingRequestsCount } from '../employee-request-hooks'

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
})
