// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClock, setClock, shiftClock, resetClock } from '../clock-api';
import type { ClockState, ShiftClockResponse } from '../clock-api';

// Mock the api-client module
vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

// Mock the api-error module
vi.mock('@/lib/api-error', () => ({
    isApiError: (error: unknown): boolean => {
        return (
            typeof error === 'object' &&
            error !== null &&
            'response' in error &&
            typeof (error as { response?: unknown }).response === 'object'
        );
    },
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = apiClient as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

describe('clock-api', () => {
    const mockClockState: ClockState = {
        mode: 'system',
        application_now_utc: '2026-04-16T15:00:00+00:00',
        business_timezone: 'America/Mexico_City',
        business_date: '2026-04-16',
        business_now: '2026-04-16T09:00:00-06:00',
    };

    const mockShiftResponse: ShiftClockResponse = {
        ...mockClockState,
        mode: 'simulated',
        shifted_minutes: 30,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getClock', () => {
        it('returns clock state on success', async () => {
            mockApiClient.get.mockResolvedValueOnce({ data: mockClockState });

            const result = await getClock();

            expect(mockApiClient.get).toHaveBeenCalledWith('/devtools/clock');
            expect(result).toEqual(mockClockState);
        });

        it('returns null when feature is disabled (404)', async () => {
            mockApiClient.get.mockRejectedValueOnce({
                response: { status: 404 },
            });

            const result = await getClock();

            expect(result).toBeNull();
        });

        it('throws error for other HTTP errors', async () => {
            const error = new Error('Network error');
            mockApiClient.get.mockRejectedValueOnce(error);

            await expect(getClock()).rejects.toThrow('Network error');
        });
    });

    describe('setClock', () => {
        it('sets clock to specific datetime', async () => {
            const simulatedState = { ...mockClockState, mode: 'simulated' as const };
            mockApiClient.post.mockResolvedValueOnce({ data: simulatedState });

            const result = await setClock('2026-04-16T10:00:00');

            expect(mockApiClient.post).toHaveBeenCalledWith('/devtools/clock/set', {
                datetime: '2026-04-16T10:00:00',
            });
            expect(result).toEqual(simulatedState);
        });

        it('returns null when feature is disabled (404)', async () => {
            mockApiClient.post.mockRejectedValueOnce({
                response: { status: 404 },
            });

            const result = await setClock('2026-04-16T10:00:00');

            expect(result).toBeNull();
        });

        it('throws error for other HTTP errors', async () => {
            mockApiClient.post.mockRejectedValueOnce({
                response: { status: 500 },
                message: 'Server error',
            });

            await expect(setClock('invalid')).rejects.toBeTruthy();
        });
    });

    describe('shiftClock', () => {
        it('shifts clock by positive minutes', async () => {
            mockApiClient.post.mockResolvedValueOnce({ data: mockShiftResponse });

            const result = await shiftClock(30);

            expect(mockApiClient.post).toHaveBeenCalledWith('/devtools/clock/shift', {
                minutes: 30,
            });
            expect(result).toEqual(mockShiftResponse);
            expect(result?.shifted_minutes).toBe(30);
        });

        it('shifts clock by negative minutes', async () => {
            const negativeShiftResponse = { ...mockShiftResponse, shifted_minutes: -60 };
            mockApiClient.post.mockResolvedValueOnce({ data: negativeShiftResponse });

            const result = await shiftClock(-60);

            expect(mockApiClient.post).toHaveBeenCalledWith('/devtools/clock/shift', {
                minutes: -60,
            });
            expect(result?.shifted_minutes).toBe(-60);
        });

        it('returns null when feature is disabled (404)', async () => {
            mockApiClient.post.mockRejectedValueOnce({
                response: { status: 404 },
            });

            const result = await shiftClock(30);

            expect(result).toBeNull();
        });

        it('throws error for other HTTP errors', async () => {
            mockApiClient.post.mockRejectedValueOnce({
                response: { status: 422 },
                message: 'Validation error',
            });

            await expect(shiftClock(999999)).rejects.toBeTruthy();
        });
    });

    describe('resetClock', () => {
        it('resets clock to system mode', async () => {
            const systemState = { ...mockClockState, mode: 'system' as const };
            mockApiClient.post.mockResolvedValueOnce({ data: systemState });

            const result = await resetClock();

            expect(mockApiClient.post).toHaveBeenCalledWith('/devtools/clock/reset');
            expect(result).toEqual(systemState);
            expect(result?.mode).toBe('system');
        });

        it('returns null when feature is disabled (404)', async () => {
            mockApiClient.post.mockRejectedValueOnce({
                response: { status: 404 },
            });

            const result = await resetClock();

            expect(result).toBeNull();
        });

        it('throws error for other HTTP errors', async () => {
            const error = new Error('Connection refused');
            mockApiClient.post.mockRejectedValueOnce(error);

            await expect(resetClock()).rejects.toThrow('Connection refused');
        });
    });
});
