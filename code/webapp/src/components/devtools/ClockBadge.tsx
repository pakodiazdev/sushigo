import { Clock, AlertTriangle, RotateCcw, Play, X, Settings } from 'lucide-react';
import { useClockBadge } from './use-clock-badge';

/**
 * Clock mode badge for the header.
 * Shows a warning indicator when clock is in simulated mode.
 * Clickable to open clock configuration panel.
 * Only visible when clock simulation feature is available.
 */
export function ClockBadge() {
    const {
        clockState,
        isAvailable,
        isLoading,
        isSimulated,
        isPanelOpen,
        dateInput,
        timeInput,
        panelRef,
        businessTime,
        setDateInput,
        setTimeInput,
        handleSetTime,
        handleReset,
        togglePanel,
        closePanel,
    } = useClockBadge();

    // Don't render if feature is not available
    if (!isAvailable || !clockState) {
        return null;
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Badge - clickable */}
            <button
                onClick={togglePanel}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    isSimulated
                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30'
                        : 'bg-blue-500/20 border border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30'
                }`}
                title="Click to configure clock"
            >
                {isSimulated && <AlertTriangle className="h-3.5 w-3.5" />}
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isSimulated ? 'SIMULATED' : 'SYSTEM'}</span>
                <span className="sm:hidden">{businessTime}</span>
                <Settings className="h-3 w-3 opacity-60" />
            </button>

            {/* Configuration Panel */}
            {isPanelOpen && (
                <div className="absolute z-50 right-0 top-full mt-2 w-72 bg-popover border rounded-lg shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 rounded-t-lg">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Clock Configuration
                        </h3>
                        <button
                            onClick={closePanel}
                            className="p-1 hover:bg-muted rounded"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Current State */}
                    <div className="px-3 py-2 border-b bg-muted/30">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Current Mode:</span>
                            <span
                                className={`font-medium ${isSimulated ? 'text-amber-500' : 'text-green-500'}`}
                            >
                                {isSimulated ? '⚠️ Simulated' : '✓ System'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Business Time:</span>
                            <span className="font-mono">{clockState.business_now}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Timezone:</span>
                            <span className="font-mono text-muted-foreground">
                                {clockState.business_timezone}
                            </span>
                        </div>
                    </div>

                    {/* Set Time Form */}
                    <div className="p-3 space-y-3">
                        <fieldset className="space-y-2">
                            <legend className="text-xs font-medium text-muted-foreground">
                                Set Simulated Time
                            </legend>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    aria-label="Simulated date"
                                    value={dateInput}
                                    onChange={(e) => setDateInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSetTime()}
                                    className="flex-1 px-2 py-1.5 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="time"
                                    aria-label="Simulated time"
                                    value={timeInput}
                                    onChange={(e) => setTimeInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSetTime()}
                                    className="w-32 px-2 py-1.5 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </fieldset>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSetTime}
                                disabled={isLoading || !dateInput || !timeInput}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Play className="h-3.5 w-3.5" />
                                Set Time
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={isLoading || !isSimulated}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            ⚠️ Only for development/testing
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
