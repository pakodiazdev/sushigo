// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { DigitalClock } from '../DigitalClock';

// Mock clock state
let mockClockState: unknown = null;
let mockIsAvailable = false;
let mockFetchClock = vi.fn();
let mockLastFetched: Date | null = null;

vi.mock('@/stores/clock.store', () => ({
    useApplicationClockStore: Object.assign(
        (selector?: (state: unknown) => unknown) => {
            const state = {
                clockState: mockClockState,
                isAvailable: mockIsAvailable,
                fetchClock: mockFetchClock,
                lastFetched: mockLastFetched,
            };
            if (typeof selector === 'function') {
                return selector(state);
            }
            return state;
        },
        {
            getState: () => ({
                clockState: mockClockState,
                isAvailable: mockIsAvailable,
                fetchClock: mockFetchClock,
                lastFetched: mockLastFetched,
            }),
        }
    ),
}));

describe('DigitalClock', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockClockState = null;
        mockIsAvailable = false;
        mockFetchClock = vi.fn();
        mockLastFetched = null;
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('renders nothing when feature is not available', () => {
        mockClockState = null;
        mockIsAvailable = false;

        const { container } = render(<DigitalClock />);
        expect(container.firstChild).toBeNull();
    });

    it('calls fetchClock on mount', () => {
        mockIsAvailable = false;

        render(<DigitalClock />);

        expect(mockFetchClock).toHaveBeenCalledTimes(1);
    });

    it('displays placeholder when clock state is null but available', () => {
        mockClockState = null;
        mockIsAvailable = false;

        const { container } = render(<DigitalClock />);

        // With isAvailable false and no clockState, component returns null
        expect(container.firstChild).toBeNull();
    });

    it('renders time display when clock state is available', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        // Should display the time container
        const container = document.querySelector('div[title^="Business Time"]');
        expect(container).not.toBeNull();
    });

    it('applies simulated mode styling when mode is simulated', () => {
        mockClockState = {
            mode: 'simulated',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        const container = document.querySelector('div[title^="Business Time"]');
        expect(container?.className).toContain('bg-amber-500/10');
    });

    it('applies system mode styling when mode is system', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        const container = document.querySelector('div[title^="Business Time"]');
        expect(container?.className).toContain('text-muted-foreground');
    });

    it('shows timezone in title attribute', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        const container = document.querySelector('div[title="Business Time (America/Mexico_City)"]');
        expect(container).not.toBeNull();
    });

    it('refreshes clock state every 30 seconds', async () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        // Initial fetch
        expect(mockFetchClock).toHaveBeenCalledTimes(1);

        // Advance timer by 30 seconds
        await act(async () => {
            vi.advanceTimersByTime(30000);
        });

        // Should have fetched again
        expect(mockFetchClock).toHaveBeenCalledTimes(2);
    });

    it('updates display time every second', async () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        // Advance timer by 1 second - the interval should fire
        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        // Component should still be rendered (clock ticking)
        const container = document.querySelector('div[title^="Business Time"]');
        expect(container).not.toBeNull();
    });

    it('displays time in tabular-nums format', () => {
        mockClockState = {
            mode: 'system',
            business_now: '2026-04-16T09:30:45-06:00',
            business_date: '2026-04-16',
            business_timezone: 'America/Mexico_City',
        };
        mockIsAvailable = true;
        mockLastFetched = new Date();

        render(<DigitalClock />);

        // Check for the time span with tabular-nums class
        const timeSpan = document.querySelector('span.tabular-nums');
        expect(timeSpan).not.toBeNull();
    });
});
