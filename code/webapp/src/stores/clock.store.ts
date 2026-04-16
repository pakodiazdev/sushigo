import { create } from 'zustand';
import {
    getClock,
    setClock,
    shiftClock,
    resetClock,
    type ClockState,
    type ClockMode,
} from '@/services/clock-api';

interface ApplicationClockState {
    // State
    clockState: ClockState | null;
    isLoading: boolean;
    isAvailable: boolean; // Whether clock simulation feature is enabled
    error: string | null;
    lastFetched: Date | null;
}

interface ApplicationClockActions {
    // Actions
    fetchClock: () => Promise<void>;
    setClockTime: (datetime: string) => Promise<boolean>;
    shiftClockTime: (minutes: number) => Promise<boolean>;
    resetClockToSystem: () => Promise<boolean>;
    clearError: () => void;
}

type ApplicationClockStore = ApplicationClockState & ApplicationClockActions;

// Selectors for computed/derived state
export const selectMode = (state: ApplicationClockState): ClockMode =>
    state.clockState?.mode ?? 'system';

export const selectIsSimulated = (state: ApplicationClockState): boolean =>
    state.clockState?.mode === 'simulated';

export const selectApplicationNowUtc = (state: ApplicationClockState): string | null =>
    state.clockState?.application_now_utc ?? null;

export const selectBusinessDate = (state: ApplicationClockState): string | null =>
    state.clockState?.business_date ?? null;

export const selectBusinessTimezone = (state: ApplicationClockState): string | null =>
    state.clockState?.business_timezone ?? null;

export const useApplicationClockStore = create<ApplicationClockStore>((set) => ({
    // Initial state
    clockState: null,
    isLoading: false,
    isAvailable: false,
    error: null,
    lastFetched: null,

    // Actions
    fetchClock: async () => {
        set({ isLoading: true, error: null });
        try {
            const state = await getClock();
            if (state === null) {
                // Feature is disabled
                set({
                    clockState: null,
                    isAvailable: false,
                    isLoading: false,
                    lastFetched: new Date(),
                });
            } else {
                set({
                    clockState: state,
                    isAvailable: true,
                    isLoading: false,
                    lastFetched: new Date(),
                });
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch clock state',
                isLoading: false,
            });
        }
    },

    setClockTime: async (datetime: string) => {
        set({ isLoading: true, error: null });
        try {
            const state = await setClock(datetime);
            if (state === null) {
                set({ isLoading: false });
                return false;
            }
            set({
                clockState: state,
                isLoading: false,
                lastFetched: new Date(),
            });
            return true;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to set clock time',
                isLoading: false,
            });
            return false;
        }
    },

    shiftClockTime: async (minutes: number) => {
        set({ isLoading: true, error: null });
        try {
            const response = await shiftClock(minutes);
            if (response === null) {
                set({ isLoading: false });
                return false;
            }
            set({
                clockState: response,
                isLoading: false,
                lastFetched: new Date(),
            });
            return true;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to shift clock time',
                isLoading: false,
            });
            return false;
        }
    },

    resetClockToSystem: async () => {
        set({ isLoading: true, error: null });
        try {
            const state = await resetClock();
            if (state === null) {
                set({ isLoading: false });
                return false;
            }
            set({
                clockState: state,
                isLoading: false,
                lastFetched: new Date(),
            });
            return true;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to reset clock',
                isLoading: false,
            });
            return false;
        }
    },

    clearError: () => set({ error: null }),
}));

/**
 * Hook to get current application time.
 * Returns the application's current UTC time if available.
 */
export function useApplicationNow(): string | null {
    return useApplicationClockStore(selectApplicationNowUtc);
}

/**
 * Hook to check if clock is in simulated mode.
 */
export function useIsClockSimulated(): boolean {
    return useApplicationClockStore(selectIsSimulated);
}

/**
 * Hook to get business date (Y-m-d in business timezone).
 */
export function useBusinessDate(): string | null {
    return useApplicationClockStore(selectBusinessDate);
}
