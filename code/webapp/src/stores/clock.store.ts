import { create } from 'zustand';
import {
    getClock,
    setClock,
    shiftClock,
    resetClock,
    type ClockState,
    type ClockMode,
} from '@/services/clock-api';

interface ApplicationClockStore {
    // State
    clockState: ClockState | null;
    isLoading: boolean;
    isAvailable: boolean; // Whether clock simulation feature is enabled
    error: string | null;
    lastFetched: Date | null;

    // Computed (derived from clockState)
    mode: ClockMode;
    isSimulated: boolean;
    applicationNowUtc: string | null;
    businessDate: string | null;
    businessTimezone: string | null;

    // Actions
    fetchClock: () => Promise<void>;
    setClockTime: (datetime: string) => Promise<boolean>;
    shiftClockTime: (minutes: number) => Promise<boolean>;
    resetClockToSystem: () => Promise<boolean>;
    clearError: () => void;
}

export const useApplicationClockStore = create<ApplicationClockStore>((set, get) => ({
    // Initial state
    clockState: null,
    isLoading: false,
    isAvailable: false,
    error: null,
    lastFetched: null,

    // Computed getters
    get mode() {
        return get().clockState?.mode ?? 'system';
    },
    get isSimulated() {
        return get().clockState?.mode === 'simulated';
    },
    get applicationNowUtc() {
        return get().clockState?.application_now_utc ?? null;
    },
    get businessDate() {
        return get().clockState?.business_date ?? null;
    },
    get businessTimezone() {
        return get().clockState?.business_timezone ?? null;
    },

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
    return useApplicationClockStore((state) => state.applicationNowUtc);
}

/**
 * Hook to check if clock is in simulated mode.
 */
export function useIsClockSimulated(): boolean {
    return useApplicationClockStore((state) => state.isSimulated);
}

/**
 * Hook to get business date (Y-m-d in business timezone).
 */
export function useBusinessDate(): string | null {
    return useApplicationClockStore((state) => state.businessDate);
}
