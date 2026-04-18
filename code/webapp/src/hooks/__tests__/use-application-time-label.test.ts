/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useApplicationTimeLabel, getApplicationTimeLabel } from '../use-application-time-label'

// Mock the clock store using two separate vi.fn() references.
// The store function is passed directly (not called) in the factory to avoid
// TypeScript's "not callable" error on Mock<Procedure | Constructable> union types.
const mockGetState = vi.fn()
const mockClockStore = Object.assign(vi.fn(), { getState: mockGetState })

vi.mock('@/stores/clock.store', () => ({
    useApplicationClockStore: mockClockStore,
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

    it('should return time when clock state has application_now_utc', () => {
        // Mock getState to return clock state with time
        mockGetState.mockReturnValue({
            clockState: { application_now_utc: '2026-04-17T18:00:00Z' }
        })

        const result = getApplicationTimeLabel()
        expect(result).toBe('12:00')
    })

    it('should return fallback time when clock state is null', () => {
        mockGetState.mockReturnValue({
            clockState: null
        })

        const result = getApplicationTimeLabel()
        expect(result).toBe('12:34')
    })

    it('should return fallback time when application_now_utc is undefined', () => {
        mockGetState.mockReturnValue({
            clockState: {}
        })

        const result = getApplicationTimeLabel()
        expect(result).toBe('12:34')
    })

    it('should return fallback time when clockState is undefined', () => {
        mockGetState.mockReturnValue({})

        const result = getApplicationTimeLabel()
        expect(result).toBe('12:34')
    })
})
