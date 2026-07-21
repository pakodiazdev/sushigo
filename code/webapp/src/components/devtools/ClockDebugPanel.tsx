import { useState, useEffect } from 'react';
import { Play, RotateCcw, FastForward, Rewind, Calendar, RefreshCw } from 'lucide-react';
import { useApplicationClockStore } from '@/stores/clock.store';

/**
 * Debug panel for controlling Application Clock simulation.
 * Styled for the dark DevDebugger context.
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

    useEffect(() => {
        if (!clockState && !isLoading) {
            fetchClock();
        }
    }, [clockState, isLoading, fetchClock]);

    if (!isAvailable && !isLoading) {
        return null;
    }

    const handleSetTime = async () => {
        if (!customDatetime) return;
        const success = await setClockTime(customDatetime);
        if (success) setCustomDatetime('');
    };

    const formatBusinessTime = (isoString: string | undefined) => {
        if (!isoString || !clockState?.business_timezone) return '--:--:--';
        return new Date(isoString).toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'medium',
            timeZone: clockState.business_timezone,
        });
    };

    const isSimulated = clockState?.mode === 'simulated';

    /** Shift by a calendar unit (month/year) — plain minute math can't express these, since months and years aren't a fixed number of minutes. Computed from the current simulated UTC time and applied via setClockTime. */
    const shiftCalendar = (unit: 'month' | 'year', amount: number) => {
        if (!clockState?.application_now_utc) return;
        const date = new Date(clockState.application_now_utc);
        if (unit === 'month') date.setUTCMonth(date.getUTCMonth() + amount);
        if (unit === 'year') date.setUTCFullYear(date.getUTCFullYear() + amount);
        setClockTime(date.toISOString());
    };

    return (
        <div className="space-y-3 text-xs">
            {/* Mode badge */}
            <div className="flex items-center justify-between">
                <span className="text-gray-400">Modo</span>
                {isSimulated ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        SIMULATED
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/40 font-mono">
                        SYSTEM
                    </span>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-2 rounded bg-red-900/40 border border-red-700/50 text-red-300 flex justify-between items-center gap-2">
                    <span className="truncate">{error}</span>
                    <button type="button" onClick={clearError} className="shrink-0 text-red-400 hover:text-red-200">✕</button>
                </div>
            )}

            {/* Current time */}
            <div className="rounded bg-gray-700/60 border border-gray-600/50 p-2 space-y-1.5">
                <div className="flex justify-between items-baseline gap-2">
                    <span className="text-gray-400 shrink-0">Business time</span>
                    <span className="font-mono text-white text-right truncate">
                        {formatBusinessTime(clockState?.business_now)}
                    </span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                    <span className="text-gray-400 shrink-0">UTC</span>
                    <span className="font-mono text-gray-300 text-right truncate text-[10px]">
                        {clockState?.application_now_utc ?? '--'}
                    </span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                    <span className="text-gray-400 shrink-0">Timezone</span>
                    <span className="font-mono text-gray-300 text-right text-[10px]">
                        {clockState?.business_timezone ?? '--'}
                    </span>
                </div>
            </div>

            {/* Quick shift */}
            <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Desplazar
                </p>
                <div className="flex flex-wrap gap-1">
                    {[
                        { label: '-1h', onClick: () => shiftClockTime(-60), icon: <Rewind className="h-3 w-3" /> },
                        { label: '-30m', onClick: () => shiftClockTime(-30) },
                        { label: '-5m', onClick: () => shiftClockTime(-5) },
                        { label: '+5m', onClick: () => shiftClockTime(5) },
                        { label: '+30m', onClick: () => shiftClockTime(30) },
                        { label: '+1h', onClick: () => shiftClockTime(60), icon: <FastForward className="h-3 w-3" /> },
                        { label: '-3d', onClick: () => shiftClockTime(-3 * 60 * 24) },
                        { label: '-1d', onClick: () => shiftClockTime(-60 * 24) },
                        { label: '+1d', onClick: () => shiftClockTime(60 * 24), icon: <Calendar className="h-3 w-3" /> },
                        { label: '+3d', onClick: () => shiftClockTime(3 * 60 * 24) },
                        { label: '-1s', onClick: () => shiftClockTime(-7 * 60 * 24) },
                        { label: '+1s', onClick: () => shiftClockTime(7 * 60 * 24) },
                        { label: '-1mes', onClick: () => shiftCalendar('month', -1) },
                        { label: '+1mes', onClick: () => shiftCalendar('month', 1) },
                        { label: '-1a', onClick: () => shiftCalendar('year', -1) },
                        { label: '+1a', onClick: () => shiftCalendar('year', 1) },
                    ].map(({ label, onClick, icon }) => (
                        <button
                            type="button"
                            key={label}
                            onClick={onClick}
                            disabled={isLoading}
                            className="flex items-center gap-0.5 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 disabled:opacity-40 transition-colors"
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Set specific time */}
            <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Fijar hora
                </p>
                <div className="flex gap-1.5">
                    <input
                        type="datetime-local"
                        value={customDatetime}
                        onChange={(e) => setCustomDatetime(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
                    />
                    <button
                        type="button"
                        onClick={handleSetTime}
                        disabled={isLoading || !customDatetime}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors shrink-0"
                    >
                        <Play className="h-3 w-3" />
                        Set
                    </button>
                </div>
            </div>

            {/* Reset + Refresh */}
            <div className="flex gap-1.5 pt-1 border-t border-gray-700">
                <button
                    type="button"
                    onClick={() => resetClockToSystem()}
                    disabled={isLoading || clockState?.mode === 'system'}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 disabled:opacity-40 transition-colors"
                >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                </button>
                <button
                    type="button"
                    onClick={() => fetchClock()}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 disabled:opacity-40 transition-colors"
                >
                    <RefreshCw className="h-3 w-3" />
                    {isLoading ? 'Cargando...' : 'Refresh'}
                </button>
            </div>
        </div>
    );
}
