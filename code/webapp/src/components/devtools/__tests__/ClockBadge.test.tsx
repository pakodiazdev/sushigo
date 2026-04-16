// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ClockBadge } from '../ClockBadge'

// Mock the store module
let mockClockState: unknown = null
let mockIsAvailable = false
let mockFetchClock = vi.fn()

vi.mock('@/stores/clock.store', () => ({
    useApplicationClockStore: (selector?: (state: unknown) => unknown) => {
        const state = {
            clockState: mockClockState,
            isAvailable: mockIsAvailable,
            fetchClock: mockFetchClock,
        }
        if (typeof selector === 'function') {
            return selector(state)
        }
        return state
    },
    selectIsSimulated: (state: { clockState?: { mode?: string } }) =>
        state.clockState?.mode === 'simulated',
}))

describe('ClockBadge', () => {
    beforeEach(() => {
        mockClockState = null
        mockIsAvailable = false
        mockFetchClock = vi.fn()
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('renders nothing when feature is not available', () => {
        mockClockState = null
        mockIsAvailable = false

        const { container } = render(<ClockBadge />)
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing when clock is in system mode', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:00:00-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        }
        mockIsAvailable = true

        const { container } = render(<ClockBadge />)
        expect(container.firstChild).toBeNull()
    })

    it('renders badge when clock is in simulated mode', () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-01-15T10:30:00-06:00',
            business_date: '2026-01-15',
            business_timezone: 'America/Mexico_City',
        }
        mockIsAvailable = true

        render(<ClockBadge />)

        expect(screen.getByText('SIMULATED')).toBeInTheDocument()
    })

    it('shows clock simulation active warning in tooltip', () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-01-15T10:30:00-06:00',
            business_date: '2026-01-15',
            business_timezone: 'America/Mexico_City',
        }
        mockIsAvailable = true

        render(<ClockBadge />)

        expect(screen.getByText('⚠️ Clock Simulation Active')).toBeInTheDocument()
        expect(screen.getByText('2026-01-15T10:30:00-06:00')).toBeInTheDocument()
        expect(screen.getByText('2026-01-15')).toBeInTheDocument()
    })

    it('calls fetchClock on mount', () => {
        mockClockState = null
        mockIsAvailable = false

        render(<ClockBadge />)

        expect(mockFetchClock).toHaveBeenCalled()
    })
})
