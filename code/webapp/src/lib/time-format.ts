/**
 * Time display format utility.
 *
 * The application supports two clock formats, configurable via .env:
 *   VITE_TIME_FORMAT=12  →  1:00 PM / 9:30 AM   (default)
 *   VITE_TIME_FORMAT=24  →  13:00 / 09:30
 *
 * The API always returns times in 24hr format (HH:mm).
 * This module handles the conversion to the configured display format.
 *
 * @see doc/conventions/frontend/time-format.md
 */

export type TimeFormat = '12' | '24'

/**
 * Active display format, driven by VITE_TIME_FORMAT env variable.
 * Defaults to '12' (12-hour with AM/PM) when the variable is absent or invalid.
 */
export const TIME_FORMAT: TimeFormat =
  import.meta.env.VITE_TIME_FORMAT === '24' ? '24' : '12'

/**
 * Format a time string (HH:mm or HH:mm:ss) for display.
 *
 * @param time   - 24hr time string from the API ("13:00", "13:00:00"), or null/undefined
 * @param format - Override the global format for one-off cases (optional)
 * @returns      - Formatted time ("1:00 PM" or "13:00"), or "—" when time is absent
 *
 * @example
 * formatTime('13:00')          // → "1:00 PM"  (default 12hr)
 * formatTime('13:00', '24')    // → "13:00"
 * formatTime('00:30')          // → "12:30 AM"
 * formatTime(null)             // → "—"
 */
export function formatTime(
  time: string | null | undefined,
  format: TimeFormat = TIME_FORMAT,
): string {
  if (!time) return '—'

  const parts = time.split(':')
  const h = Number.parseInt(parts[0] ?? '', 10)
  const m = Number.parseInt(parts[1] ?? '', 10)

  if (Number.isNaN(h) || Number.isNaN(m)) return '—'

  if (format === '24') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // 12-hour format
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12 // 0 → 12 (midnight), 12 → 12 (noon)
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
