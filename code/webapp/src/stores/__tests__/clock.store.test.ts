import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    useApplicationClockStore,
    selectMode,
    selectIsSimulated,
    selectApplicationNowUtc,
    selectBusinessDate,
    selectBusinessTimezone,
} from '../clock.store'
import type { ClockState } from '@/services/clock-api'

// Mock the clock-api module
vi.mock('@/services/clock-api', () => ({
    getClock: vi.fn(),
    setClock: vi.fn(),
    shiftClock: vi.fn(),
    resetClock: vi.fn(),
}))

import { getClock, setClock, shiftClock, resetClock } from '@/services/clock-api'

const mockGetClock = getClock as ReturnType<typeof vi.fn>
const mockSetClock = setClock as ReturnType<typeof vi.fn>
const mockShiftClock = shiftClock as ReturnType<typeof vi.fn>
const mockResetClock = resetClock as ReturnType<typeof vi.fn>

const mockClockState: ClockState = {
    mode: 'system',
    application_now_utc: '2026-04-16T15:00:00+00:00',
    business_now: '2026-04-16T09:00:00-06:00',
    business_date: '2026-04-16',
    business_timezone: 'America/Mexico_City',
}

const mockSimulatedState: ClockState = {
    mode: 'simulated',
    application_now_utc: '2026-01-15T10:00:00+00:00',
    business_now: '2026-01-15T04:00:00-06:00',
    business_date: '2026-01-15',
    business_timezone: 'America/Mexico_City',
}

describe('useApplicationClockStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useApplicationClockStore.setState({
            clockState: null,
            isLoading: false,
            isAvailable: false,
            error: null,
            lastFetched: null,
        })
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.resetAllMocks()
    })

    describe('initial state', () => {
        it('starts with null clock state', () => {
            const state = useApplicationClockStore.getState()
            expect(state.clockState).toBeNull()
            expect(state.isLoading).toBe(false)
            expect(state.isAvailable).toBe(false)
            expect(state.error).toBeNull()
        })

        it('selector returns system mode when no clock state', () => {
            const state = useApplicationClockStore.getState()
            expect(selectMode(state)).toBe('system')
            expect(selectIsSimulated(state)).toBe(false)
        })
    })

    describe('fetchClock', () => {
        it('sets isLoading true while fetching', async () => {
            mockGetClock.mockImplementation(() => new Promise(() => {})) // Never resolves

            const fetchPromise = useApplicationClockStore.getState().fetchClock()

            expect(useApplicationClockStore.getState().isLoading).toBe(true)

            // Cleanup - we need to let the promise settle
            vi.clearAllMocks()
        })

        it('updates clock state on successful fetch', async () => {
            mockGetClock.mockResolvedValue(mockClockState)

            await useApplicationClockStore.getState().fetchClock()

            const state = useApplicationClockStore.getState()
            expect(state.clockState).toEqual(mockClockState)
            expect(state.isAvailable).toBe(true)
            expect(state.isLoading).toBe(false)
            expect(state.lastFetched).toBeInstanceOf(Date)
        })

        it('sets isAvailable false when feature is disabled (null response)', async () => {
            mockGetClock.mockResolvedValue(null)

            await useApplicationClockStore.getState().fetchClock()

            const state = useApplicationClockStore.getState()
            expect(state.clockState).toBeNull()
            expect(state.isAvailable).toBe(false)
            expect(state.isLoading).toBe(false)
        })

        it('sets error on fetch failure', async () => {
            mockGetClock.mockRejectedValue(new Error('Network error'))

            await useApplicationClockStore.getState().fetchClock()

            const state = useApplicationClockStore.getState()
            expect(state.error).toBe('Network error')
            expect(state.isLoading).toBe(false)
        })
    })

    describe('setClockTime', () => {
        it('updates clock state on successful set', async () => {
            mockSetClock.mockResolvedValue(mockSimulatedState)

            const result = await useApplicationClockStore.getState().setClockTime('2026-01-15T10:00:00')

            expect(result).toBe(true)
            const state = useApplicationClockStore.getState()
            expect(state.clockState).toEqual(mockSimulatedState)
            expect(state.isLoading).toBe(false)
        })

        it('returns false when feature is disabled', async () => {
            mockSetClock.mockResolvedValue(null)

            const result = await useApplicationClockStore.getState().setClockTime('2026-01-15T10:00:00')

            expect(result).toBe(false)
        })

        it('sets error on failure', async () => {
            mockSetClock.mockRejectedValue(new Error('Failed to set'))

            const result = await useApplicationClockStore.getState().setClockTime('2026-01-15T10:00:00')

            expect(result).toBe(false)
            expect(useApplicationClockStore.getState().error).toBe('Failed to set')
        })
    })

    describe('shiftClockTime', () => {
        it('shifts clock time by minutes', async () => {
            mockShiftClock.mockResolvedValue(mockSimulatedState)

            const result = await useApplicationClockStore.getState().shiftClockTime(60)

            expect(result).toBe(true)
            expect(mockShiftClock).toHaveBeenCalledWith(60)
            expect(useApplicationClockStore.getState().clockState).toEqual(mockSimulatedState)
        })

        it('returns false when feature is disabled', async () => {
            mockShiftClock.mockResolvedValue(null)

            const result = await useApplicationClockStore.getState().shiftClockTime(30)

            expect(result).toBe(false)
        })
    })

    describe('resetClockToSystem', () => {
        it('resets clock to system mode', async () => {
            // First set to simulated
            useApplicationClockStore.setState({ clockState: mockSimulatedState })
            mockResetClock.mockResolvedValue(mockClockState)

            const result = await useApplicationClockStore.getState().resetClockToSystem()

            expect(result).toBe(true)
            expect(useApplicationClockStore.getState().clockState?.mode).toBe('system')
        })

        it('returns false when feature is disabled', async () => {
            mockResetClock.mockResolvedValue(null)

            const result = await useApplicationClockStore.getState().resetClockToSystem()

            expect(result).toBe(false)
        })
    })

    describe('selectors', () => {
        it('selectMode returns clock state mode', () => {
            useApplicationClockStore.setState({ clockState: mockSimulatedState })

            expect(selectMode(useApplicationClockStore.getState())).toBe('simulated')
        })

        it('selectIsSimulated returns true when mode is simulated', () => {
            useApplicationClockStore.setState({ clockState: mockSimulatedState })

            expect(selectIsSimulated(useApplicationClockStore.getState())).toBe(true)
        })

        it('selectIsSimulated returns false when mode is system', () => {
            useApplicationClockStore.setState({ clockState: mockClockState })

            expect(selectIsSimulated(useApplicationClockStore.getState())).toBe(false)
        })

        it('selectApplicationNowUtc returns UTC time from state', () => {
            useApplicationClockStore.setState({ clockState: mockClockState })

            expect(selectApplicationNowUtc(useApplicationClockStore.getState())).toBe('2026-04-16T15:00:00+00:00')
        })

        it('selectBusinessDate returns date from state', () => {
            useApplicationClockStore.setState({ clockState: mockClockState })

            expect(selectBusinessDate(useApplicationClockStore.getState())).toBe('2026-04-16')
        })

        it('selectBusinessTimezone returns timezone from state', () => {
            useApplicationClockStore.setState({ clockState: mockClockState })

            expect(selectBusinessTimezone(useApplicationClockStore.getState())).toBe('America/Mexico_City')
        })
    })

    describe('clearError', () => {
        it('clears the error state', () => {
            useApplicationClockStore.setState({ error: 'Some error' })

            useApplicationClockStore.getState().clearError()

            expect(useApplicationClockStore.getState().error).toBeNull()
        })
    })
})
