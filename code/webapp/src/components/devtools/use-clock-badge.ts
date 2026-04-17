import { useEffect, useState, useRef, useCallback } from 'react';
import { useApplicationClockStore, selectIsSimulated } from '@/stores/clock.store';

/**
 * Custom hook for ClockBadge component.
 * Manages clock state, panel visibility, and simulation controls.
 */
export function useClockBadge() {
    const clockState = useApplicationClockStore((state) => state.clockState);
    const isAvailable = useApplicationClockStore((state) => state.isAvailable);
    const isLoading = useApplicationClockStore((state) => state.isLoading);
    const isSimulated = useApplicationClockStore(selectIsSimulated);
    const fetchClock = useApplicationClockStore((state) => state.fetchClock);
    const setClockTime = useApplicationClockStore((state) => state.setClockTime);
    const resetClockToSystem = useApplicationClockStore((state) => state.resetClockToSystem);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [dateInput, setDateInput] = useState('');
    const [timeInput, setTimeInput] = useState('');
    const panelRef = useRef<HTMLDivElement>(null);

    // Fetch clock state on mount
    useEffect(() => {
        fetchClock();
    }, [fetchClock]);

    // Close panel on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        }
        if (isPanelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isPanelOpen]);

    // Initialize inputs when panel opens
    useEffect(() => {
        if (isPanelOpen && clockState) {
            const businessDate = clockState.business_date;
            const businessTime = new Date(clockState.business_now).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: clockState.business_timezone,
            });
            setDateInput(businessDate);
            setTimeInput(businessTime);
        }
    }, [isPanelOpen, clockState]);

    // Computed business time for display (in business timezone)
    const businessTime = clockState
        ? new Date(clockState.business_now).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: clockState.business_timezone,
          })
        : '';

    const handleSetTime = useCallback(async () => {
        if (!dateInput || !timeInput) return;
        const datetime = `${dateInput} ${timeInput}:00`;
        const success = await setClockTime(datetime);
        if (success) {
            setIsPanelOpen(false);
        }
    }, [dateInput, timeInput, setClockTime]);

    const handleReset = useCallback(async () => {
        const success = await resetClockToSystem();
        if (success) {
            setIsPanelOpen(false);
        }
    }, [resetClockToSystem]);

    const togglePanel = useCallback(() => {
        setIsPanelOpen((prev) => !prev);
    }, []);

    const closePanel = useCallback(() => {
        setIsPanelOpen(false);
    }, []);

    return {
        // State
        clockState,
        isAvailable,
        isLoading,
        isSimulated,
        isPanelOpen,
        dateInput,
        timeInput,
        panelRef,
        businessTime,

        // Setters
        setDateInput,
        setTimeInput,

        // Handlers
        handleSetTime,
        handleReset,
        togglePanel,
        closePanel,
    };
}
