/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useApplicationTimeLabel, getApplicationTimeLabel } from '../use-application-time-label'

// Mock the clock store
const mockClockStore = vi.fn()
vi.mock('@/stores/clock.store', () => ({
    useApplicationClockStore: (selector: unknown) => mockClockStore(selector),
    selectApplicationNowUtc: (state: { clockState?: { application_now_utc?: string } }) =>
        state.clockState?.application_now_utc,
}))

// Mock timezone
vi.mock('@/lib/timezone', () => ({
    getFrontendTimezone: () => 'America/Mexico_City',
}))

// Mock datetime helper (used as fallback)
vi.mock('@/lib/datetime', () => ({
    currentTimeLabel: () => '12:34',
}))

describe('useApplicationTimeLabel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('when Application Clock has data', () => {
        it('should format UTC time to HH:mm in frontend timezone', () => {
            // 2026-04-17T15:30:00Z UTC = 09:30 in Mexico City (UTC-6)
            mockClockStore.mockReturnValue('2026-04-17T15:30:00Z')

            const { result } = renderHook(() => useApplicationTimeLabel())

            expect(result.current).toMatch(/^\d{2}:\d{2}$/)
        })

        it('should handle midnight UTC correctly', () => {
            // 2026-04-17T06:00:00Z UTC = 00:00 in Mexico City (UTC-6)
            mockClockStore.mockReturnValue('2026-04-17T06:00:00Z')

            const { result } = renderHook(() => useApplicationTimeLabel())

            expect(result.current).toBe('00:00')
        })

        it('should handle noon UTC correctly', () => {
            // 2026-04-17T18:00:00Z UTC = 12:00 in Mexico City (UTC-6)
            mockClockStore.mockReturnValue('2026-04-17T18:00:00Z')

            const { result } = renderHook(() => useApplicationTimeLabel())

            expect(result.current).toBe('12:00')
        })

        it('should handle end of day correctly', () => {
            // 2026-04-18T05:59:00Z UTC = 23:59 in Mexico City (UTC-6)
            mockClockStore.mockReturnValue('2026-04-18T05:59:00Z')

            const { result } = renderHook(() => useApplicationTimeLabel())

            expect(result.current).toBe('23:59')
        })
    })

    describe('when Application Clock has no data', () => {
        it('should return browser time format when store returns null', () => {
            mockClockStore.mockReturnValue(null)

            const { result } = renderHook(() => useApplicationTimeLabel())

            // Should fallback to currentTimeLabel mock
            expect(result.current).toBe('12:34')
        })

        it('should return browser time format when store returns undefined', () => {
            mockClockStore.mockReturnValue(undefined)

            const { result } = renderHook(() => useApplicationTimeLabel())

            expect(result.current).toBe('12:34')
        })
    })

    describe('when Application Clock has invalid data', () => {
        it('should fallback to browser time for invalid ISO string', () => {
            mockClockStore.mockReturnValue('invalid-date')

            const { result } = renderHook(() => useApplicationTimeLabel())

            // Should fallback to currentTimeLabel mock
            expect(result.current).toBe('12:34')
        })

        it('should fallback to browser time for empty string', () => {
            mockClockStore.mockReturnValue('')

            const { result } = renderHook(() => useApplicationTimeLabel())

            expect(result.current).toBe('12:34')
        })
    })
})

describe('getApplicationTimeLabel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should be a function', () => {
        expect(typeof getApplicationTimeLabel).toBe('function')
    })

    // Note: getApplicationTimeLabel reads directly from store.getState()
    // which is harder to test without more complex mocking.
    // The main logic is shared with useApplicationTimeLabel which is tested above.
})
