import { formatTime } from '@/lib/time-format'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── Schedule summary helpers ──────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in browser local time. */
function getLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Single-letter abbreviations for ISO DOW 1=Mon…7=Sun (Mexican convention). */
const DOW_ABBR = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
const DOW_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

/** Compute the compact day-range label (e.g. "L-V", "L-D", "LXV"). */
function computeDayRangeLabel(working: ScheduleDay[], resting: ScheduleDay[]): string {
  if (working.length === 7) return 'L-D'
  if (working.length === 1) return DOW_NAMES[working[0]!.day_of_week - 1]!

  const isConsecutive = working.every(
    (d, i) => i === 0 || d.day_of_week === working[i - 1]!.day_of_week + 1,
  )
  if (isConsecutive) {
    return `${DOW_ABBR[working[0]!.day_of_week - 1]}-${DOW_ABBR[working[working.length - 1]!.day_of_week - 1]}`
  }

  // Non-consecutive — check if the rest block is contiguous (circular range).
  const isRestConsecutive = resting.every(
    (d, i) => i === 0 || d.day_of_week === resting[i - 1]!.day_of_week + 1,
  )
  if (isRestConsecutive) {
    const firstWork = working[0]!
    const lastWork = working[working.length - 1]!
    return `${DOW_ABBR[firstWork.day_of_week - 1]}-${DOW_ABBR[lastWork.day_of_week - 1]}`
  }

  return working.map((d) => DOW_ABBR[d.day_of_week - 1]).join('')
}

/**
 * Apply indefinite overrides (effective_to === null) to the base days.
 * Only overrides whose effective_from <= asOf (defaults to today) are applied.
 * When multiple indefinite overrides exist for the same DOW, the most-recently
 * started one (latest effective_from) takes precedence.
 */
export function resolveScheduleDays(
  days: ScheduleDay[],
  overrides: ScheduleDayOverride[],
  asOf: string = getLocalDate(),
): ScheduleDay[] {
  const effective = overrides.filter((o) => o.effective_to === null && o.effective_from <= asOf)
  if (effective.length === 0) return days
  return days.map((day) => {
    const override = [...effective]
      .filter((o) => o.day_of_week === day.day_of_week)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
    if (!override) return day
    return {
      ...day,
      is_day_off: override.is_day_off,
      expected_start: override.expected_start,
      expected_lunch_start: override.expected_lunch_start,
      expected_lunch_end: override.expected_lunch_end,
      lunch_duration_minutes: override.lunch_duration_minutes,
      expected_end: override.expected_end,
    }
  })
}

/** Comma-separated abbreviations for a group of days: "L, M, J" */
function buildGroupLabel(groupDays: ScheduleDay[]): string {
  return groupDays.map((d) => DOW_ABBR[d.day_of_week - 1]).join(', ')
}

/**
 * Build the work-time text line (without icon prefix) for a set of working days.
 * When `hasIndefiniteOverrides` is true, groups days by (start, end) slot.
 * Otherwise falls back to the compact consecutive-range format.
 */
function buildWorkText(
  working: ScheduleDay[],
  resting: ScheduleDay[],
  hasIndefiniteOverrides: boolean,
): string {
  if (hasIndefiniteOverrides) {
    const groups = new Map<string, ScheduleDay[]>()
    for (const day of working) {
      const key = `${day.expected_start}|${day.expected_end}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(day)
    }
    const groupParts = [...groups.values()]
      .sort((a, b) => a[0]!.day_of_week - b[0]!.day_of_week)
      .map((groupDays) => {
        const ref = groupDays[0]!
        return `${buildGroupLabel(groupDays)} · ${formatTime(ref.expected_start)} – ${formatTime(ref.expected_end)}`
      })
    return `🕐 ${groupParts.join(' · ')}`
  }
  const dayRange = computeDayRangeLabel(working, resting)
  const ref = working[0]!
  return `🕐 ${dayRange} · ${formatTime(ref.expected_start)} – ${formatTime(ref.expected_end)}`
}

/**
 * Given the 7 schedule days (and optional overrides), build 1-3 compact summary lines:
 *   • Work:  "L-V · 1:00 PM – 10:00 PM"  (or grouped when indefinite overrides exist)
 *   • Lunch: "Comida 1 hr a las 4:00 PM"   (omitted if no lunch configured)
 *   • Rest:  "Descansa Sábado, Domingo"     (omitted if 0 rest days)
 */
export function buildSummaryLines(
  days: ScheduleDay[],
  overrides: ScheduleDayOverride[] = [],
  asOf: string = getLocalDate(),
): { icon: 'work' | 'lunch' | 'rest'; text: string }[] {
  const resolved = resolveScheduleDays(days, overrides, asOf)
  const hasIndefiniteOverrides = overrides.some((o) => o.effective_to === null && o.effective_from <= asOf)

  const working = resolved.filter((d) => !d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)
  const resting = resolved.filter((d) => d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)

  if (working.length === 0) return []

  const lines: { icon: 'work' | 'lunch' | 'rest'; text: string }[] = []

  lines.push({ icon: 'work', text: buildWorkText(working, resting, hasIndefiniteOverrides) })

  // ── Lunch (first working day that has lunch configured) ─────────────────────
  const lunchRef = working.find((d) => d.expected_lunch_start !== null && d.lunch_duration_minutes !== null)
  if (lunchRef) {
    const mins = lunchRef.lunch_duration_minutes!
    const durLabel = mins % 60 === 0 ? `${mins / 60} hr` : `${mins} min`
    lines.push({
      icon: 'lunch',
      text: `🍽️ ${durLabel} a las ${formatTime(lunchRef.expected_lunch_start)}`,
    })
  }

  // ── Rest days ────────────────────────────────────────────────────────────────
  if (resting.length > 0) {
    const restLabel = resting.map((d) => DOW_NAMES[d.day_of_week - 1]).join(', ')
    lines.push({ icon: 'rest', text: `🏠 ${restLabel}` })
  }

  return lines
}

export function calcDayHours(start: string | null, end: string | null, lunchMinutes: number | null): number | null {
  if (!start || !end) return null
  const toMin = (t: string) => { const [h = 0, m = 0] = t.split(':').map(Number); return h * 60 + m }
  const startMin = toMin(start)
  const endMin = toMin(end)
  // Handle cross-midnight shifts (e.g. 19:00 → 04:00)
  const span = endMin >= startMin ? endMin - startMin : endMin + 1440 - startMin
  const net = span - (lunchMinutes ?? 0)
  return net > 0 ? net / 60 : null
}

export function formatHours(h: number | null): string {
  if (h === null) return '—'
  const total = Math.round(h * 60)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

export function overrideDateLabel(o: ScheduleDayOverride): string {
  const from = new Date(o.effective_from + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  if (o.effective_to === null) return `desde ${from}`
  if (o.effective_from === o.effective_to) return from
  const to = new Date(o.effective_to + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${from} – ${to}`
}

// ── Compact summary for dialog header ─────────────────────────────────────────

const DOW_SHORT_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

/**
 * Build a compact one-line summary of the schedule.
 * Format: "🕐 L-V · 1:00 PM – 10:00 PM · 🍽 1h · 🏠 Sáb-Dom"
 * When indefinite overrides are present:
 * "🕐 L, M, J, V, S · 1:00 PM – 10:00 PM · X · 2:00 PM – 11:00 PM · 🍽 1h · 🏠 Dom"
 */
export function buildCompactSummaryLine(
  days: ScheduleDay[],
  overrides: ScheduleDayOverride[] = [],
  asOf: string = getLocalDate(),
): string {
  const resolved = resolveScheduleDays(days, overrides, asOf)
  const hasIndefiniteOverrides = overrides.some((o) => o.effective_to === null && o.effective_from <= asOf)

  const working = resolved.filter((d) => !d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)
  const resting = resolved.filter((d) => d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)

  if (working.length === 0) return ''

  const parts: string[] = []

  parts.push(buildWorkText(working, resting, hasIndefiniteOverrides))

  // Lunch duration (first working day with lunch configured)
  const lunchRef = working.find((d) => d.expected_lunch_start !== null && d.lunch_duration_minutes !== null)
  if (lunchRef) {
    const mins = lunchRef.lunch_duration_minutes!
    const durLabel = mins % 60 === 0 ? `${mins / 60}h` : `${mins}min`
    parts.push(`🍽 ${durLabel}`)
  }

  // Rest days
  if (resting.length > 0) {
    const restLabel = resting.map((d) => DOW_SHORT_NAMES[d.day_of_week - 1]).join('-')
    parts.push(`🏠 ${restLabel}`)
  }

  return parts.join(' · ')
}
