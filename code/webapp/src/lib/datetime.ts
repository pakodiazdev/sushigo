/** CDMX timezone offset — hardcoded to UTC-6 (standard time). DST is not handled. */
const CDMX_OFFSET_HOURS = -6

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Get current time in CDMX timezone as "HH:mm".
 * Uses manual UTC offset calculation for cross-environment compatibility.
 */
export function currentTimeLabel(): string {
  const now = new Date()
  const cdmxTime = new Date(now.getTime() + CDMX_OFFSET_HOURS * 60 * 60 * 1000)
  const hours = cdmxTime.getUTCHours()
  const minutes = cdmxTime.getUTCMinutes()
  return `${pad(hours)}:${pad(minutes)}`
}

/**
 * Get today's date in CDMX timezone as "YYYY-MM-DD".
 * Uses manual UTC offset calculation for cross-environment compatibility.
 */
export function todayDateCdmx(): string {
  const now = new Date()
  const cdmxTime = new Date(now.getTime() + CDMX_OFFSET_HOURS * 60 * 60 * 1000)
  return `${cdmxTime.getUTCFullYear()}-${pad(cdmxTime.getUTCMonth() + 1)}-${pad(cdmxTime.getUTCDate())}`
}
