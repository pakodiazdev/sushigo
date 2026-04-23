// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAdmin = vi.fn().mockReturnValue(false)

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({ isAdmin: mockIsAdmin() }),
}))

const mockPendingCount = vi.fn().mockReturnValue({ data: 0 })

vi.mock('@/services/employee-request-hooks', () => ({
    usePendingRequestsCount: () => mockPendingCount(),
}))

import { useSolicitudesPage } from '../use-solicitudes-page'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSolicitudesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockIsAdmin.mockReturnValue(false)
        mockPendingCount.mockReturnValue({ data: 0 })
    })

    it('initializes with activeTab=mine', () => {
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.activeTab).toBe('mine')
    })

    it('isManager is false when user is not admin', () => {
        mockIsAdmin.mockReturnValue(false)
        const { result } = renderHook(() => useSolicitudesPage())
        expect(result.current.isManager).toBe(false)
    })

    it('isManager is true when user is admin', () => {
        mockIsAdmin.mockReturnValue(true)
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
})
