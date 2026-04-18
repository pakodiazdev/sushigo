import { useApplicationClockStore, selectApplicationNowUtc } from '@/stores/clock.store'
import { getFrontendTimezone } from '@/lib/timezone'
import { currentTimeLabel } from '@/lib/datetime'

/**
 * Hook that returns the current time from the Application Clock as "HH:mm".
 *
 * This is the React hook version of `currentTimeLabel()` that respects
 * the Application Clock (system or simulated mode).
 *
 * When the clock is in simulated mode, this returns the simulated time.
 * When in system mode or if clock data isn't available, falls back to browser time.
 *
 * @returns Current time in "HH:mm" format from Application Clock
 */
export function useApplicationTimeLabel(): string {
    const applicationNowUtc = useApplicationClockStore(selectApplicationNowUtc)

    // If we have Application Clock data, use it
    if (applicationNowUtc) {
        return formatUtcToTimeLabel(applicationNowUtc)
    }

    // Fallback to browser time using shared datetime helper
    return currentTimeLabel()
}

/**
 * Format a UTC ISO string to "HH:mm" in the frontend timezone.
 */
function formatUtcToTimeLabel(utcIsoString: string): string {
    const date = new Date(utcIsoString)
    if (Number.isNaN(date.getTime())) {
        return currentTimeLabel()
    }

    const timezone = getFrontendTimezone()
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23',
    })

    const parts = formatter.formatToParts(date)
    const hours = parts.find((p) => p.type === 'hour')?.value ?? '00'
    const minutes = parts.find((p) => p.type === 'minute')?.value ?? '00'
    return `${hours}:${minutes}`
}

/**
 * Get the current time from Application Clock as "HH:mm".
 * Non-hook version for use in callbacks or outside React components.
 *
 * This reads directly from the store's current state.
 * Prefer `useApplicationTimeLabel()` hook when inside React components.
 *
 * @returns Current time in "HH:mm" format
 */
export function getApplicationTimeLabel(): string {
    const state = useApplicationClockStore.getState()
    const applicationNowUtc = state.clockState?.application_now_utc

    if (applicationNowUtc) {
        return formatUtcToTimeLabel(applicationNowUtc)
    }

    return currentTimeLabel()
}
