import { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useApplicationClockStore, selectIsSimulated } from '@/stores/clock.store';

/**
 * Clock mode badge for the header.
 * Shows a warning indicator when clock is in simulated mode.
 * Only visible when clock simulation feature is available.
 */
export function ClockBadge() {
    const clockState = useApplicationClockStore((state) => state.clockState);
    const isAvailable = useApplicationClockStore((state) => state.isAvailable);
    const isSimulated = useApplicationClockStore(selectIsSimulated);
    const fetchClock = useApplicationClockStore((state) => state.fetchClock);

    // Fetch clock state on mount
    useEffect(() => {
        fetchClock();
    }, [fetchClock]);

    // Don't render if feature is not available
    if (!isAvailable || !clockState) {
        return null;
    }

    // Don't show badge in system mode
    if (!isSimulated) {
        return null;
    }

    const businessTime = new Date(clockState.business_now).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="relative group">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-medium cursor-help">
                <AlertTriangle className="h-3.5 w-3.5" />
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">SIMULATED</span>
                <span className="sm:hidden">{businessTime}</span>
            </div>

            {/* Tooltip */}
            <div className="invisible group-hover:visible absolute z-50 right-0 top-full mt-2 w-64 px-3 py-2 text-sm bg-popover border rounded-lg shadow-lg">
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    ⚠️ Clock Simulation Active
                </p>
                <div className="space-y-1 text-sm">
                    <p>
                        <span className="text-muted-foreground">Business Time:</span>{' '}
                        <span className="font-medium">{clockState.business_now}</span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Business Date:</span>{' '}
                        <span className="font-medium">{clockState.business_date}</span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Timezone: {clockState.business_timezone}
                    </p>
                </div>
                {/* Arrow */}
                <span className="absolute right-4 bottom-full border-8 border-transparent border-b-popover" />
            </div>
        </div>
    );
}
