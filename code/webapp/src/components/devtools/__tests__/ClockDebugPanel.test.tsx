// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ClockDebugPanel } from '../ClockDebugPanel';

// Mock state
let mockClockState: unknown = null;
let mockIsAvailable = false;
let mockIsLoading = false;
let mockError: string | null = null;
let mockFetchClock = vi.fn();
let mockSetClockTime = vi.fn();
let mockShiftClockTime = vi.fn();
let mockResetClockToSystem = vi.fn();
let mockClearError = vi.fn();

vi.mock('@/stores/clock.store', () => ({
    useApplicationClockStore: () => ({
        clockState: mockClockState,
        isAvailable: mockIsAvailable,
        isLoading: mockIsLoading,
        error: mockError,
        fetchClock: mockFetchClock,
        setClockTime: mockSetClockTime,
        shiftClockTime: mockShiftClockTime,
        resetClockToSystem: mockResetClockToSystem,
        clearError: mockClearError,
    }),
}));

describe('ClockDebugPanel', () => {
    beforeEach(() => {
        mockClockState = null;
        mockIsAvailable = false;
        mockIsLoading = false;
        mockError = null;
        mockFetchClock = vi.fn();
        mockSetClockTime = vi.fn().mockResolvedValue(true);
        mockShiftClockTime = vi.fn().mockResolvedValue(true);
        mockResetClockToSystem = vi.fn().mockResolvedValue(true);
        mockClearError = vi.fn();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders nothing when feature is not available and not loading', () => {
        mockIsAvailable = false;
        mockIsLoading = false;

        const { container } = render(<ClockDebugPanel />);
        expect(container.firstChild).toBeNull();
    });

    it('fetches clock state on mount when clockState is null', () => {
        mockClockState = null;
        mockIsLoading = false;

        render(<ClockDebugPanel />);

        expect(mockFetchClock).toHaveBeenCalled();
    });

    it('renders panel when feature is available', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        expect(screen.getByText('Modo')).toBeDefined();
    });

    it('displays SYSTEM badge when mode is system', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        expect(screen.getByText('SYSTEM')).toBeDefined();
    });

    it('displays SIMULATED badge when mode is simulated', () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        expect(screen.getByText('SIMULATED')).toBeDefined();
    });

    it('displays error message when error exists', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;
        mockError = 'Failed to set clock';

        render(<ClockDebugPanel />);

        expect(screen.getByText('Failed to set clock')).toBeDefined();
        expect(screen.getByText('✕')).toBeDefined();
    });

    it('calls clearError when dismiss button is clicked', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;
        mockError = 'Error message';

        render(<ClockDebugPanel />);

        fireEvent.click(screen.getByText('✕'));

        expect(mockClearError).toHaveBeenCalled();
    });

    it('displays business date and timezone', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        expect(screen.getByText('2026-04-16T15:30:45+00:00')).toBeDefined();
        expect(screen.getByText('America/Mexico_City')).toBeDefined();
    });

    it('renders quick shift buttons', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        expect(screen.getByText('-1h')).toBeDefined();
        expect(screen.getByText('-30m')).toBeDefined();
        expect(screen.getByText('-5m')).toBeDefined();
        expect(screen.getByText('+5m')).toBeDefined();
        expect(screen.getByText('+30m')).toBeDefined();
        expect(screen.getByText('+1h')).toBeDefined();
        expect(screen.getByText('+1d')).toBeDefined();
    });

    it('calls shiftClockTime when quick shift button is clicked', async () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        fireEvent.click(screen.getByText('+30m'));

        await waitFor(() => {
            expect(mockShiftClockTime).toHaveBeenCalledWith(30);
        });
    });

    it('calls shiftClockTime with negative minutes for backward shift', async () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        fireEvent.click(screen.getByText('-1h'));

        await waitFor(() => {
            expect(mockShiftClockTime).toHaveBeenCalledWith(-60);
        });
    });

    it('calls shiftClockTime with 1440 minutes for +1d', async () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        fireEvent.click(screen.getByText('+1d'));

        await waitFor(() => {
            expect(mockShiftClockTime).toHaveBeenCalledWith(60 * 24);
        });
    });

    it('disables reset button when already in system mode', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        const resetButton = screen.getByText('Reset').closest('button');
        expect(resetButton?.disabled).toBe(true);
    });

    it('enables reset button when in simulated mode', () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        const resetButton = screen.getByText('Reset').closest('button');
        expect(resetButton?.disabled).toBe(false);
    });

    it('calls resetClockToSystem when reset button is clicked', async () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        fireEvent.click(screen.getByText('Reset'));

        await waitFor(() => {
            expect(mockResetClockToSystem).toHaveBeenCalled();
        });
    });

    it('disables Set button when datetime input is empty', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        const setButton = screen.getByText('Set').closest('button');
        expect(setButton?.disabled).toBe(true);
    });

    it('disables all buttons when loading', () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;
        mockIsLoading = true;

        render(<ClockDebugPanel />);

        const shiftButton = screen.getByText('+30m').closest('button');
        expect(shiftButton?.disabled).toBe(true);
    });

    it('shows loading text in refresh button when loading', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;
        mockIsLoading = true;

        render(<ClockDebugPanel />);

        expect(screen.getByText('Cargando...')).toBeDefined();
    });

    it('shows refresh button text when not loading', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;
        mockIsLoading = false;

        render(<ClockDebugPanel />);

        expect(screen.getByText('Refresh')).toBeDefined();
    });

    it('calls fetchClock when refresh button is clicked', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;
        mockIsLoading = false;

        render(<ClockDebugPanel />);

        // Reset to clear mount call
        mockFetchClock.mockClear();

        fireEvent.click(screen.getByText('Refresh'));

        expect(mockFetchClock).toHaveBeenCalled();
    });

    it('formats business time with placeholder when undefined', () => {
        mockClockState = {
            mode: 'system',
            business_now: undefined,
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        // Should show placeholder for undefined business_now
        expect(screen.getByText('--:--:--')).toBeDefined();
    });

    it('renders datetime input for setting specific time', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
            application_now_utc: '2026-04-16T15:30:45+00:00',
        };
        mockIsAvailable = true;

        render(<ClockDebugPanel />);

        const datetimeInput = document.querySelector('input[type="datetime-local"]');
        expect(datetimeInput).not.toBeNull();
    });
});
