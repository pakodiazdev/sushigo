import { useEffect, useState, useCallback } from 'react';
import { useApplicationClockStore } from '@/stores/clock.store';

/**
 * Digital clock component that displays the current business time
 * according to the Application Clock system.
 *
 * - In "system" mode: shows real time, updated every second
 * - In "simulated" mode: shows simulated time, updated every second
 *
 * Uses the clock store to fetch and display time from the backend.
 * Time is always displayed in the business timezone (e.g., America/Mexico_City),
 * not in the browser's local timezone.
 */
export function DigitalClock() {
    const clockState = useApplicationClockStore((state) => state.clockState);
    const isAvailable = useApplicationClockStore((state) => state.isAvailable);
    const fetchClock = useApplicationClockStore((state) => state.fetchClock);

    // Local state for displaying time with seconds ticking
    const [displayTime, setDisplayTime] = useState<string>('--:--:--');
    const [displayDate, setDisplayDate] = useState<string>('');

    // Calculate the current time based on clockState and elapsed time
    const updateDisplayTime = useCallback(() => {
        if (!clockState) {
            setDisplayTime('--:--:--');
            setDisplayDate('');
            return;
        }

        // Parse the business_now time and add elapsed seconds since last fetch
        const businessNow = new Date(clockState.business_now);
        const lastFetched = useApplicationClockStore.getState().lastFetched;

        if (lastFetched && clockState.mode === 'simulated') {
            // In simulated mode, we need to tick the clock forward
            const elapsedMs = Date.now() - lastFetched.getTime();
            businessNow.setTime(businessNow.getTime() + elapsedMs);
        } else if (clockState.mode === 'system') {
            // In system mode, just use current time in business timezone
            // The backend returns current time, so we tick locally
            const elapsedMs = lastFetched ? Date.now() - lastFetched.getTime() : 0;
            businessNow.setTime(businessNow.getTime() + elapsedMs);
        }

        // Format time as HH:MM:SS in the BUSINESS timezone (not browser local)
        const businessTz = clockState.business_timezone;
        const timeStr = businessNow.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: businessTz,
        });

        // Format date as "Mié 16 Abr" in the BUSINESS timezone
        const dateStr = businessNow.toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: businessTz,
        });

        setDisplayTime(timeStr);
        setDisplayDate(dateStr);
    }, [clockState]);

    // Fetch clock state on mount
    useEffect(() => {
        fetchClock();
    }, [fetchClock]);

    // Update display every second
    useEffect(() => {
        updateDisplayTime();
        const interval = setInterval(updateDisplayTime, 1000);
        return () => clearInterval(interval);
    }, [updateDisplayTime]);

    // Refresh from server every 30 seconds to stay in sync
    useEffect(() => {
        const interval = setInterval(() => {
            fetchClock();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchClock]);

    // Don't render if feature is not available
    if (!isAvailable) {
        return null;
    }

    const isSimulated = clockState?.mode === 'simulated';

    return (
        <div
            className={`hidden sm:flex flex-col items-end px-2 py-1 rounded-md text-xs font-mono ${
                isSimulated
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
            }`}
            title={`Business Time (${clockState?.business_timezone ?? 'loading...'})`}
        >
            <span className="text-sm font-semibold tabular-nums">{displayTime}</span>
            <span className="text-[10px] opacity-70">{displayDate}</span>
        </div>
    );
}
