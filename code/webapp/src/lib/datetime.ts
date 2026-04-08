/** CDMX timezone offset — hardcoded to UTC-6 (standard time). DST is not handled. */
const CDMX_OFFSET_HOURS = -6

/**
 * Get current time in CDMX timezone as "HH:mm".
 * Uses manual UTC offset calculation for cross-environment compatibility.
 */
export function currentTimeLabel(): string {
  const now = new Date()
  const cdmxTime = new Date(now.getTime() + CDMX_OFFSET_HOURS * 60 * 60 * 1000)
  const hours = cdmxTime.getUTCHours()
  const minutes = cdmxTime.getUTCMinutes()
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
