import { formatTime } from '@/lib/time-format'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── Schedule summary helpers ──────────────────────────────────────────────────

/** Single-letter abbreviations for ISO DOW 1=Mon…7=Sun (Mexican convention). */
const DOW_ABBR  = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
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
    const lastWork  = working[working.length - 1]!
    return `${DOW_ABBR[firstWork.day_of_week - 1]}-${DOW_ABBR[lastWork.day_of_week - 1]}`
  }

  return working.map((d) => DOW_ABBR[d.day_of_week - 1]).join('')
}

/**
 * Given the 7 schedule days, build 1-3 compact summary lines:
 *   • Work:  "L-V · 1:00 PM – 10:00 PM"
 *   • Lunch: "Comida 1 hr a las 4:00 PM"   (omitted if no lunch configured)
 *   • Rest:  "Descansa Sábado, Domingo"     (omitted if 0 rest days)
 */
export function buildSummaryLines(days: ScheduleDay[]): { icon: 'work' | 'lunch' | 'rest'; text: string }[] {
  const working = days.filter((d) => !d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)
  const resting = days.filter((d) =>  d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)

  if (working.length === 0) return []

  const dayRange = computeDayRangeLabel(working, resting)

  // ── Times (use the first working day as reference) ───────────────────────────
  const ref = working[0]!
  const startT = formatTime(ref.expected_start)
  const endT   = formatTime(ref.expected_end)

  const lines: { icon: 'work' | 'lunch' | 'rest'; text: string }[] = []

  lines.push({ icon: 'work', text: `🕐 ${dayRange} · ${startT} – ${endT}` })

  // ── Lunch ────────────────────────────────────────────────────────────────────
  if (ref.expected_lunch_start && ref.lunch_duration_minutes) {
    const mins = ref.lunch_duration_minutes
    const durLabel = mins % 60 === 0 ? `${mins / 60} hr` : `${mins} min`
    lines.push({
      icon: 'lunch',
      text: `🍽️ ${durLabel} a las ${formatTime(ref.expected_lunch_start)}`,
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
