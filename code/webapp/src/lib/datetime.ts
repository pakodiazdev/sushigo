import { getFrontendTimezone } from './timezone'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Get current time in business timezone as "HH:mm".
 * Uses centralized timezone resolver for proper timezone handling.
 */
export function currentTimeLabel(): string {
  const now = new Date()
  const timezone = getFrontendTimezone()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hours = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minutes = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hours}:${minutes}`
}

/**
 * Get today's date in business timezone as "YYYY-MM-DD".
 * Uses centralized timezone resolver for proper timezone handling.
 */
export function todayDateCdmx(): string {
  const now = new Date()
  const timezone = getFrontendTimezone()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // en-CA locale formats as YYYY-MM-DD
  return formatter.format(now)
}
