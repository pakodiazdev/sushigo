// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCan = vi.fn().mockReturnValue(false)

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({ can: mockCan }),
}))

const mockPendingCount = vi.fn().mockReturnValue({ data: 0 })
const mockPendingCountCalls: Array<{ enabled?: boolean }> = []

vi.mock('@/services/employee-request-hooks', () => ({
    usePendingRequestsCount: (opts?: { enabled?: boolean }) => {
        mockPendingCountCalls.push(opts ?? {})
        return mockPendingCount()
    },
}))

import { useSolicitudesPage } from '../use-solicitudes-page'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSolicitudesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPendingCountCalls.length = 0
        mockCan.mockReturnValue(false)
        mockPendingCount.mockReturnValue({ data: 0 })
    })

    it('initializes with activeTab=mine', () => {
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.activeTab).toBe('mine')
    })

    it('isManager is false when user lacks employee-requests.approve', () => {
        mockCan.mockReturnValue(false)
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.isManager).toBe(false)
    })

    it('isManager is true when user has employee-requests.approve', () => {
        mockCan.mockReturnValue(true)
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.isManager).toBe(true)
    })

    it('pendingCount defaults to 0', () => {
        mockPendingCount.mockReturnValue({ data: undefined })
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.pendingCount).toBe(0)
    })

    it('pendingCount reflects the value from usePendingRequestsCount', () => {
        mockPendingCount.mockReturnValue({ data: 7 })
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.pendingCount).toBe(7)
    })

    it('onTabChange updates activeTab to pending', () => {
        const { result } = renderHook(() => useSolicitudesPage())
        act(() => result.current.onTabChange('pending'))
        expect(result.current.activeTab).toBe('pending')
    })

    it('onTabChange updates activeTab back to mine', () => {
        const { result } = renderHook(() => useSolicitudesPage())
        act(() => result.current.onTabChange('pending'))
        act(() => result.current.onTabChange('mine'))
        expect(result.current.activeTab).toBe('mine')
    })

    it('exposes onTabChange function', () => {
        const { result } = renderHook(() => useSolicitudesPage())
        expect(typeof result.current.onTabChange).toBe('function')
    })

    it('passes enabled=false to usePendingRequestsCount when user lacks approve permission', () => {
        mockCan.mockReturnValue(false)
        renderHook(() => useSolicitudesPage())
        expect(mockPendingCountCalls[0]).toEqual({ enabled: false })
    })

    it('passes enabled=true to usePendingRequestsCount when user has approve permission', () => {
        mockCan.mockReturnValue(true)
        renderHook(() => useSolicitudesPage())
        expect(mockPendingCountCalls[0]).toEqual({ enabled: true })
    })
})
