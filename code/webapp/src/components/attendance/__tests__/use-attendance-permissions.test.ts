// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAttendancePermissions } from '../use-attendance-permissions'

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockIsAdmin = false

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (s: { isAdmin: boolean }) => boolean) =>
        selector({ isAdmin: mockIsAdmin }),
}))

vi.mock('@/lib/datetime', () => ({
    todayDateCdmx: () => '2026-06-24',
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAttendancePermissions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('admin user', () => {
        beforeEach(() => { mockIsAdmin = true })

        it('can edit today', () => {
            const { result } = renderHook(() => useAttendancePermissions('2026-06-24'))
            expect(result.current.canEdit).toBe(true)
            expect(result.current.requiresReason).toBe(false)
        })

        it('can edit past day and requires reason', () => {
            const { result } = renderHook(() => useAttendancePermissions('2026-06-23'))
            expect(result.current.canEdit).toBe(true)
            expect(result.current.requiresReason).toBe(true)
        })

        it('handles null date', () => {
            const { result } = renderHook(() => useAttendancePermissions(null))
            expect(result.current.canEdit).toBe(true)
            expect(result.current.requiresReason).toBe(false)
        })
    })

    describe('manager (non-admin) user', () => {
        beforeEach(() => { mockIsAdmin = false })

        it('can edit today', () => {
            const { result } = renderHook(() => useAttendancePermissions('2026-06-24'))
            expect(result.current.canEdit).toBe(true)
            expect(result.current.requiresReason).toBe(false)
        })

        it('cannot edit past day', () => {
            const { result } = renderHook(() => useAttendancePermissions('2026-06-23'))
            expect(result.current.canEdit).toBe(false)
            expect(result.current.requiresReason).toBe(false)
        })

        it('handles null date (defaults to can edit, no reason)', () => {
            const { result } = renderHook(() => useAttendancePermissions(null))
            expect(result.current.canEdit).toBe(true)
            expect(result.current.requiresReason).toBe(false)
        })
    })
})
