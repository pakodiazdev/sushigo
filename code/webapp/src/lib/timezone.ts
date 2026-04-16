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
 * @returns IANA timezone identifier (e.g., 'America/Mexico_City')
 */
export function getFrontendTimezone(): string {
    // TODO: In the future, check user profile preference first
    // const userPreference = getUserTimezonePreference();
    // if (userPreference) return userPreference;

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
 * Format a UTC ISO string to a localized date string.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in frontend timezone
 */
export function formatDateInFrontendTz(
    utcIsoString: string,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
    try {
        const date = new Date(utcIsoString);
        return date.toLocaleDateString('es-MX', {
            ...options,
            timeZone: getFrontendTimezone(),
        });
    } catch {
        return utcIsoString;
    }
}

/**
 * Format a UTC ISO string to a localized time string.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string in frontend timezone
 */
export function formatTimeInFrontendTz(
    utcIsoString: string,
    options: Intl.DateTimeFormatOptions = { timeStyle: 'short' }
): string {
    try {
        const date = new Date(utcIsoString);
        return date.toLocaleTimeString('es-MX', {
            ...options,
            timeZone: getFrontendTimezone(),
        });
    } catch {
        return utcIsoString;
    }
}

/**
 * Format a UTC ISO string to a localized datetime string.
 *
 * @param utcIsoString - ISO 8601 UTC datetime string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted datetime string in frontend timezone
 */
export function formatDateTimeInFrontendTz(
    utcIsoString: string,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
): string {
    try {
        const date = new Date(utcIsoString);
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
    try {
        const date = new Date(utcIsoString);
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
        return '';
    }
}

/**
 * Convert a datetime-local input value to an ISO string with timezone offset.
 * Useful for sending local times to the API.
 *
 * @param datetimeLocalValue - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns ISO 8601 string with timezone offset
 */
export function fromDatetimeLocalValue(datetimeLocalValue: string): string {
    try {
        // Parse as local time and return with offset
        const date = new Date(datetimeLocalValue);
        return date.toISOString();
    } catch {
        return datetimeLocalValue;
    }
}
