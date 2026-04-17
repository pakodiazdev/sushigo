/**
 * Centralized frontend timezone resolver.
 *
 * Priority (future-first):
 * 1. User-preferred timezone from profile (when available)
 * 2. Browser timezone (current default)
 *
 * All datetime parsing and rendering should use this resolver
 * instead of hardcoded timezones or offsets.
 */

/**
 * Get the current frontend timezone for displaying dates/times.
 *
 * Note: In the future, this may check user profile preference first
 * before falling back to browser timezone.
 *
 * @returns IANA timezone identifier (e.g., 'America/Mexico_City')
 */
export function getFrontendTimezone(): string {
    // Default: browser timezone
    return getBrowserTimezone();
}

/**
 * Get the browser's timezone.
 *
 * @returns IANA timezone identifier
 */
export function getBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        // Fallback if Intl is not available (very rare)
        return 'America/Mexico_City';
    }
}

/**
 * Default options for formatDateInFrontendTz.
 */
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };

/**
 * Format a UTC ISO string to a localized date string.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in frontend timezone
 */
export function formatDateInFrontendTz(
    utcIsoString: string,
    options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
    try {
        const date = new Date(utcIsoString);
        if (Number.isNaN(date.getTime())) {
            return utcIsoString;
        }
        return date.toLocaleDateString('es-MX', {
            ...options,
            timeZone: getFrontendTimezone(),
        });
    } catch {
        return utcIsoString;
    }
}

/**
 * Default options for formatTimeInFrontendTz.
 */
const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = { timeStyle: 'short' };

/**
 * Format a UTC ISO string to a localized time string.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string in frontend timezone
 */
export function formatTimeInFrontendTz(
    utcIsoString: string,
    options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTIONS
): string {
    try {
        const date = new Date(utcIsoString);
        if (Number.isNaN(date.getTime())) {
            return utcIsoString;
        }
        return date.toLocaleTimeString('es-MX', {
            ...options,
            timeZone: getFrontendTimezone(),
        });
    } catch {
        return utcIsoString;
    }
}

/**
 * Default options for formatDateTimeInFrontendTz.
 */
const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/**
 * Format a UTC ISO string to a localized datetime string.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted datetime string in frontend timezone
 */
export function formatDateTimeInFrontendTz(
    utcIsoString: string,
    options: Intl.DateTimeFormatOptions = DEFAULT_DATETIME_OPTIONS
): string {
    try {
        const date = new Date(utcIsoString);
        if (Number.isNaN(date.getTime())) {
            return utcIsoString;
        }
        return date.toLocaleString('es-MX', {
            ...options,
            timeZone: getFrontendTimezone(),
        });
    } catch {
        return utcIsoString;
    }
}

/**
 * Get a datetime-local input value from a UTC ISO string.
 * Useful for populating datetime-local inputs with server times.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @returns Local datetime string in YYYY-MM-DDTHH:mm format
 */
export function toDatetimeLocalValue(utcIsoString: string): string {
    const date = new Date(utcIsoString);
    // new Date('invalid') doesn't throw - it creates an Invalid Date
    // where getTime() returns NaN. We must check explicitly.
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert a datetime-local input value to an ISO string with timezone offset.
 * Useful for sending local times to the API.
 *
 * @param datetimeLocalValue - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns ISO 8601 string with timezone offset
 */
export function fromDatetimeLocalValue(datetimeLocalValue: string): string {
    // Parse as local time and return with offset
    const date = new Date(datetimeLocalValue);
    // new Date('invalid') doesn't throw - it creates an Invalid Date
    if (Number.isNaN(date.getTime())) {
        return datetimeLocalValue;
    }
    return date.toISOString();
}

/**
 * Get timezone offset string in format ±HH:MM for current frontend timezone.
 * Uses a reference date to calculate the offset.
 *
 * @param referenceDate - Date to use for offset calculation (default: now)
 * @returns Offset string like "-06:00" or "+05:30"
 */
export function getTimezoneOffsetString(referenceDate: Date = new Date()): string {
    const timezone = getFrontendTimezone();

    // Use Intl to get the offset by comparing formatted times
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset',
    });

    const parts = formatter.formatToParts(referenceDate);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';

    // longOffset returns "GMT-06:00" or "GMT+05:30", extract the offset part
    const offsetRegex = /GMT([+-]\d{2}:\d{2})/;
    const match = offsetRegex.exec(tzPart);
    if (match?.[1]) {
        return match[1];
    }

    // Fallback: calculate from Date object offset (local machine timezone)
    const offsetMinutes = referenceDate.getTimezoneOffset();
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
}

/**
 * Create an ISO 8601 datetime string with timezone offset from HH:mm time.
 * Uses today's date in the frontend timezone.
 *
 * @param hhmm - Time string in "HH:mm" format
 * @returns ISO 8601 string with timezone offset (e.g., "2026-04-16T09:30:00-06:00")
 * @throws TypeError if time format is invalid
 */
export function timeToIsoWithOffset(hhmm: string): string {
    if (!hhmm?.includes(':')) {
        throw new TypeError(`Invalid time value: "${hhmm}"`);
    }

    const [hoursStr, minutesStr] = hhmm.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        throw new TypeError(`Invalid time value: "${hhmm}"`);
    }

    const timezone = getFrontendTimezone();
    const now = new Date();

    // Get today's date components in the target timezone
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const todayDate = dateFormatter.format(now); // YYYY-MM-DD

    const pad = (n: number) => String(n).padStart(2, '0');
    const offset = getTimezoneOffsetString(now);

    return `${todayDate}T${pad(hours)}:${pad(minutes)}:00${offset}`;
}
