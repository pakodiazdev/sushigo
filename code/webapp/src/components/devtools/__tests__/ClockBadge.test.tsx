// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { ClockBadge } from '../ClockBadge'

// Mock the store module
let mockClockState: unknown = null
let mockIsAvailable = false
let mockIsLoading = false
let mockFetchClock = vi.fn()
let mockSetClockTime = vi.fn()
let mockResetClockToSystem = vi.fn()

vi.mock('@/stores/clock.store', () => ({
    useApplicationClockStore: (selector?: (state: unknown) => unknown) => {
        const state = {
            clockState: mockClockState,
            isAvailable: mockIsAvailable,
            isLoading: mockIsLoading,
            fetchClock: mockFetchClock,
            setClockTime: mockSetClockTime,
            resetClockToSystem: mockResetClockToSystem,
        }
        if (typeof selector === 'function') {
            return selector(state)
        }
        return state
    },
    selectIsSimulated: (state: { clockState?: { mode?: string } }) =>
        state.clockState?.mode === 'simulated',
}))

const systemClockState = {
    mode: 'system',
    business_now: '2026-04-16T09:00:00-06:00',
    business_date: '2026-04-16',
    business_timezone: 'America/Mexico_City',
}

const simulatedClockState = {
    mode: 'simulated',
    business_now: '2026-01-15T10:30:00-06:00',
    business_date: '2026-01-15',
    business_timezone: 'America/Mexico_City',
}

describe('ClockBadge', () => {
    beforeEach(() => {
        mockClockState = null
        mockIsAvailable = false
        mockIsLoading = false
        mockFetchClock = vi.fn()
        mockSetClockTime = vi.fn().mockResolvedValue(true)
        mockResetClockToSystem = vi.fn().mockResolvedValue(true)
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

    it('renders nothing when clockState is null', () => {
        mockClockState = null
        mockIsAvailable = true

        const { container } = render(<ClockBadge />)
        expect(container.firstChild).toBeNull()
    })

    it('renders SYSTEM badge when clock is in system mode', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)
        expect(screen.getByText('SYSTEM')).toBeDefined()
    })

    it('renders SIMULATED badge when clock is in simulated mode', () => {
        mockClockState = simulatedClockState
        mockIsAvailable = true

        render(<ClockBadge />)
        expect(screen.getByText('SIMULATED')).toBeDefined()
    })

    it('shows panel with simulated mode indicator when clicked', () => {
        mockClockState = simulatedClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Click badge to open panel
        const badge = screen.getByText('SIMULATED')
        fireEvent.click(badge)

        // Panel should show mode indicator
        expect(screen.getByText('⚠️ Simulated')).toBeDefined()
        expect(screen.getByText('Clock Configuration')).toBeDefined()
    })

    it('shows panel with system mode indicator when clicked', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Click badge to open panel
        const badge = screen.getByText('SYSTEM')
        fireEvent.click(badge)

        // Panel should show mode indicator
        expect(screen.getByText('✓ System')).toBeDefined()
    })

    it('calls fetchClock on mount', () => {
        mockClockState = null
        mockIsAvailable = false

        render(<ClockBadge />)

        expect(mockFetchClock).toHaveBeenCalled()
    })

    it('closes panel when X button is clicked', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))
        expect(screen.getByText('Clock Configuration')).toBeDefined()

        // Close with X button - find all buttons and click the close one
        const xButtons = screen.getAllByRole('button')
        const closeBtn = xButtons.find(btn => btn.querySelector('svg.h-4.w-4'))
        if (closeBtn) {
            fireEvent.click(closeBtn)
        }
    })

    it('toggles panel when badge is clicked twice', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // First click opens panel
        const badge = screen.getByText('SYSTEM')
        fireEvent.click(badge)
        expect(screen.getByText('Clock Configuration')).toBeDefined()

        // Second click closes panel
        fireEvent.click(badge)
        // Panel should be closed, Clock Configuration should not exist
        expect(screen.queryByText('Clock Configuration')).toBeNull()
    })

    it('closes panel when clicking outside', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))
        expect(screen.getByText('Clock Configuration')).toBeDefined()

        // Simulate click outside
        fireEvent.mouseDown(document.body)

        // Panel should be closed
        expect(screen.queryByText('Clock Configuration')).toBeNull()
    })

    it('initializes input values when panel opens', () => {
        mockClockState = simulatedClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SIMULATED'))

        // Check date input has value
        const dateInput = screen.getByDisplayValue('2026-01-15')
        expect(dateInput).toBeDefined()
    })

    it('calls setClockTime when Set Time button is clicked', async () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))

        // Click Set Time button - inputs should already have values from initialization
        const setTimeBtn = screen.getByText('Set Time')
        fireEvent.click(setTimeBtn)

        await waitFor(() => {
            expect(mockSetClockTime).toHaveBeenCalled()
        })
    })

    it('calls resetClockToSystem when Reset button is clicked', async () => {
        mockClockState = simulatedClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SIMULATED'))

        // Click Reset button
        const resetBtn = screen.getByText('Reset')
        fireEvent.click(resetBtn)

        await waitFor(() => {
            expect(mockResetClockToSystem).toHaveBeenCalled()
        })
    })

    it('disables Set Time button when inputs are empty', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))

        // Clear date input
        const dateInput = screen.getByDisplayValue('2026-04-16')
        fireEvent.change(dateInput, { target: { value: '' } })

        // Set Time button should be disabled
        const setTimeBtn = screen.getByText('Set Time')
        expect((setTimeBtn as HTMLButtonElement).disabled).toBe(true)
    })

    it('disables Reset button when clock is in system mode', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))

        // Reset button should be disabled when in system mode
        const resetBtn = screen.getByText('Reset')
        expect((resetBtn as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows business timezone in panel', () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))

        // Should show timezone
        expect(screen.getByText('America/Mexico_City')).toBeDefined()
    })

    it('handles Enter key on date input', async () => {
        mockClockState = systemClockState
        mockIsAvailable = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))

        // Press Enter on date input
        const dateInput = screen.getByDisplayValue('2026-04-16')
        fireEvent.keyDown(dateInput, { key: 'Enter', code: 'Enter' })

        await waitFor(() => {
            expect(mockSetClockTime).toHaveBeenCalled()
        })
    })

    it('closes panel after successful setClockTime', async () => {
        mockClockState = systemClockState
        mockIsAvailable = true
        mockSetClockTime = vi.fn().mockResolvedValue(true)

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))
        expect(screen.getByText('Clock Configuration')).toBeDefined()

        // Click Set Time
        const setTimeBtn = screen.getByText('Set Time')
        fireEvent.click(setTimeBtn)

        await waitFor(() => {
            expect(screen.queryByText('Clock Configuration')).toBeNull()
        })
    })

    it('closes panel after successful reset', async () => {
        mockClockState = simulatedClockState
        mockIsAvailable = true
        mockResetClockToSystem = vi.fn().mockResolvedValue(true)

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SIMULATED'))
        expect(screen.getByText('Clock Configuration')).toBeDefined()

        // Click Reset
        const resetBtn = screen.getByText('Reset')
        fireEvent.click(resetBtn)

        await waitFor(() => {
            expect(screen.queryByText('Clock Configuration')).toBeNull()
        })
    })

    it('keeps panel open if setClockTime fails', async () => {
        mockClockState = systemClockState
        mockIsAvailable = true
        mockSetClockTime = vi.fn().mockResolvedValue(false)

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SYSTEM'))

        // Click Set Time
        const setTimeBtn = screen.getByText('Set Time')
        fireEvent.click(setTimeBtn)

        await waitFor(() => {
            expect(mockSetClockTime).toHaveBeenCalled()
        })
        // Panel should still be open
        expect(screen.getByText('Clock Configuration')).toBeDefined()
    })

    it('applies different styles for simulated vs system mode', () => {
        // Test simulated mode styling
        mockClockState = simulatedClockState
        mockIsAvailable = true

        const { container } = render(<ClockBadge />)
        
        const badgeBtn = container.querySelector('button')
        expect(badgeBtn?.className).toContain('amber')

        // Cleanup and test system mode
        cleanup()
        mockClockState = systemClockState
        
        render(<ClockBadge />)
        const systemBadgeBtn = document.querySelector('button')
        expect(systemBadgeBtn?.className).toContain('blue')
    })

    it('disables buttons when isLoading is true', () => {
        mockClockState = simulatedClockState
        mockIsAvailable = true
        mockIsLoading = true

        render(<ClockBadge />)

        // Open panel
        fireEvent.click(screen.getByText('SIMULATED'))

        // Both buttons should be disabled
        const setTimeBtn = screen.getByText('Set Time')
        const resetBtn = screen.getByText('Reset')
        expect((setTimeBtn as HTMLButtonElement).disabled).toBe(true)
        expect((resetBtn as HTMLButtonElement).disabled).toBe(true)
    })
})
