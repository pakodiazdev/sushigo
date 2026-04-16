import { useState, useEffect } from 'react';
import { Clock, Play, RotateCcw, FastForward, Rewind, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApplicationClockStore } from '@/stores/clock.store';

/**
 * Debug panel for controlling Application Clock simulation.
 * Only renders when clock simulation feature is available.
 */
export function ClockDebugPanel() {
    const {
        clockState,
        isAvailable,
        isLoading,
        error,
        fetchClock,
        setClockTime,
        shiftClockTime,
        resetClockToSystem,
        clearError,
    } = useApplicationClockStore();

    const [customDatetime, setCustomDatetime] = useState('');

    // Fetch clock state on mount to check availability
    useEffect(() => {
        if (!clockState && !isLoading) {
            fetchClock();
        }
    }, [clockState, isLoading, fetchClock]);

    // Don't render if feature is not available
    if (!isAvailable && !isLoading) {
        return null;
    }

    const handleSetTime = async () => {
        if (!customDatetime) return;
        const success = await setClockTime(customDatetime);
        if (success) {
            setCustomDatetime('');
        }
    };

    const handleShift = async (minutes: number) => {
        await shiftClockTime(minutes);
    };

    const handleReset = async () => {
        await resetClockToSystem();
    };

    // Format time in the business timezone (not browser local)
    const formatBusinessTime = (isoString: string | undefined) => {
        if (!isoString || !clockState?.business_timezone) return '--:--:--';
        return new Date(isoString).toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'medium',
            timeZone: clockState.business_timezone,
        });
    };

    return (
        <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Application Clock (Devtools)</h3>
                {clockState?.mode === 'simulated' && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50">
                        SIMULATED
                    </span>
                )}
                {clockState?.mode === 'system' && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/50">
                        SYSTEM
                    </span>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={clearError}>
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Current time display */}
            <div className="mb-6 p-4 rounded-md bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground mb-1">Business Time</p>
                        <p className="font-mono text-lg font-semibold">
                            {formatBusinessTime(clockState?.business_now)}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground mb-1">Business Date</p>
                        <p className="font-mono text-lg font-semibold">
                            {clockState?.business_date || '--'}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground mb-1">UTC Time</p>
                        <p className="font-mono text-sm">
                            {clockState?.application_now_utc || '--'}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground mb-1">Timezone</p>
                        <p className="font-mono text-sm">
                            {clockState?.business_timezone || '--'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick shift buttons */}
            <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Quick Shift</p>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(-60)}
                        disabled={isLoading}
                        className="gap-1"
                    >
                        <Rewind className="h-3.5 w-3.5" />
                        -1h
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(-30)}
                        disabled={isLoading}
                    >
                        -30m
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(-5)}
                        disabled={isLoading}
                    >
                        -5m
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(5)}
                        disabled={isLoading}
                    >
                        +5m
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(30)}
                        disabled={isLoading}
                    >
                        +30m
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(60)}
                        disabled={isLoading}
                        className="gap-1"
                    >
                        +1h
                        <FastForward className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShift(60 * 24)}
                        disabled={isLoading}
                        className="gap-1"
                    >
                        +1d
                        <Calendar className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Set specific time */}
            <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Set Specific Time</p>
                <div className="flex gap-2">
                    <Input
                        type="datetime-local"
                        value={customDatetime}
                        onChange={(e) => setCustomDatetime(e.target.value)}
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSetTime}
                        disabled={isLoading || !customDatetime}
                        className="gap-1"
                    >
                        <Play className="h-4 w-4" />
                        Set
                    </Button>
                </div>
            </div>

            {/* Reset to system */}
            <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Reset clock to real system time
                </p>
                <Button
                    variant="secondary"
                    onClick={handleReset}
                    disabled={isLoading || clockState?.mode === 'system'}
                    className="gap-1"
                >
                    <RotateCcw className="h-4 w-4" />
                    Reset to System
                </Button>
            </div>

            {/* Refresh button */}
            <div className="mt-4 pt-4 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchClock()}
                    disabled={isLoading}
                    className="w-full"
                >
                    {isLoading ? 'Loading...' : 'Refresh Clock State'}
                </Button>
            </div>
        </div>
    );
}
