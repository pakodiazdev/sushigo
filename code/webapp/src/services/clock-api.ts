import { apiClient } from '@/lib/api-client';
import { isApiError } from '@/lib/api-error';

export type ClockMode = 'system' | 'simulated';

export interface ClockState {
    mode: ClockMode;
    application_now_utc: string;
    business_timezone: string;
    business_date: string;
    business_now: string;
}

export interface ShiftClockResponse extends ClockState {
    shifted_minutes: number;
}

/**
 * Get current Application Clock state.
 * Returns null if clock simulation is disabled (404).
 */
export async function getClock(): Promise<ClockState | null> {
    try {
        const response = await apiClient.get<ClockState>('/devtools/clock');
        return response.data;
    } catch (error) {
        if (isApiError(error) && error.response?.status === 404) {
            return null; // Feature disabled
        }
        throw error;
    }
}

/**
 * Set Application Clock to a specific datetime (simulated mode).
 * Returns null if clock simulation is disabled (404).
 */
export async function setClock(datetime: string): Promise<ClockState | null> {
    try {
        const response = await apiClient.post<ClockState>('/devtools/clock/set', { datetime });
        return response.data;
    } catch (error) {
        if (isApiError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

/**
 * Shift Application Clock by N minutes (positive or negative).
 * Returns null if clock simulation is disabled (404).
 */
export async function shiftClock(minutes: number): Promise<ShiftClockResponse | null> {
    try {
        const response = await apiClient.post<ShiftClockResponse>('/devtools/clock/shift', { minutes });
        return response.data;
    } catch (error) {
        if (isApiError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

/**
 * Reset Application Clock to system mode (real time).
 * Returns null if clock simulation is disabled (404).
 */
export async function resetClock(): Promise<ClockState | null> {
    try {
        const response = await apiClient.post<ClockState>('/devtools/clock/reset');
        return response.data;
    } catch (error) {
        if (isApiError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}
