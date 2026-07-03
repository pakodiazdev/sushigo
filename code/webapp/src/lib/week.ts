/**
 * Payroll week boundaries.
 *
 * WEEK_START_DAY follows ISO weekday numbering: 1=Monday … 7=Sunday.
 * Configured via VITE_WEEK_START_DAY; defaults to 1 (Monday).
 *
 * SushiGo convention: weeks run Monday–Sunday. Cut-off is end of Sunday;
 * payments are issued on Monday of the following week.
 *
 * Two numbering/grouping schemes coexist here:
 *  - `weeksInYear` / `weekNumberForDate` — the week's ordinal position within
 *    the YEAR (1..52/53), used for payroll reference. Week 1 starts on the
 *    first Monday (or configured start day) ON OR AFTER Jan 1 — days before
 *    that belong to no week of this year.
 *  - `weeksInMonth` / `weekOrdinalInMonth` — a week's ordinal position within
 *    the MONTH it starts in (1st..5th), for calendar-navigation display. A
 *    week belongs to whichever month it starts in, even if it runs into the
 *    next month.
 */

import { getFrontendTimezone } from './timezone'

const WEEK_START_DAY = Number.parseInt(import.meta.env.VITE_WEEK_START_DAY ?? '1', 10)

/**
 * Formats a Date as "YYYY-MM-DD" via plain UTC extraction. Only correct when
 * `d` was itself constructed as system-local midnight of a known calendar
 * date (as every caller in this file does) — local midnight and its UTC
 * calendar day always agree, regardless of the runtime's timezone, so this
 * stays self-consistent with `new Date(dateStr + 'T00:00:00')` construction.
 * Do NOT use this to extract "today" from `new Date()` (the current instant)
 * — that needs `todayInBusinessTz()` below instead.
 */
function toIsoDate(d: Date): string {
  return d.toISOString().substring(0, 10)
}

/** Today's date as observed in the business timezone — "YYYY-MM-DD". */
function todayInBusinessTz(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: getFrontendTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Shifts a `YYYY-MM-DD` date string by `n` days (negative to go back). */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toIsoDate(d)
}

/** Returns the Monday (or configured start day) – Sunday range containing `dateStr`. */
export function weekRangeContaining(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr + 'T00:00:00')
  const jsDay = date.getDay() // 0=Sun … 6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay // 1=Mon … 7=Sun
  const daysFromStart = (isoDay - WEEK_START_DAY + 7) % 7
  const start = addDays(dateStr, -daysFromStart)
  return { start, end: addDays(start, 6) }
}

/** Returns the Monday (or configured start day) and Sunday of the current week. */
export function currentWeekRange(): { start: string; end: string } {
  return weekRangeContaining(todayInBusinessTz())
}

/** Formats a week range as "16 jun – 22 jun 2026" for display. */
export function formatWeekLabel(start: string, end: string): string {
  const shortDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const endYear = new Date(end + 'T00:00:00').getFullYear()
  return `${shortDate(start)} – ${shortDate(end)} ${endYear}`
}

/** Start date (Mon, or configured start day) of the first week belonging to `year`-`month` (0-based). */
function firstWeekStart(year: number, month: number): string {
  const day1 = new Date(year, month, 1)
  const jsDay = day1.getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay
  const daysToAdd = (WEEK_START_DAY - isoDay + 7) % 7
  const d = new Date(day1)
  d.setDate(day1.getDate() + daysToAdd)
  return toIsoDate(d)
}

// ── Week-of-year numbering (payroll reference number) ───────────────────────────

export interface WeekOption {
  weekNumber: number
  start: string
  end: string
}

/**
 * Enumerates every payroll week (Mon–Sun, or configured start day) in `year`.
 * Week 1 starts on the first Monday on/after Jan 1 (days before that belong
 * to no week of this year). The week containing next year's Jan 1 belongs to
 * that next year instead — each week is assigned to exactly one year.
 */
export function weeksInYear(year: number): WeekOption[] {
  let cursor = firstWeekStart(year, 0)
  const nextYearStart = firstWeekStart(year + 1, 0)

  const weeks: WeekOption[] = []
  let weekNumber = 1
  while (cursor !== nextYearStart) {
    weeks.push({ weekNumber, start: cursor, end: addDays(cursor, 6) })
    cursor = addDays(cursor, 7)
    weekNumber++
  }
  return weeks
}

/** Resolves which (year, weekNumber) a week-start date belongs to, per `weeksInYear`. */
export function weekNumberForDate(dateStr: string): { year: number; weekNumber: number } {
  const year = Number(dateStr.slice(0, 4))
  for (const candidateYear of [year, year + 1]) {
    const match = weeksInYear(candidateYear).find((w) => w.start === dateStr)
    if (match) return { year: candidateYear, weekNumber: match.weekNumber }
  }
  return { year, weekNumber: 1 }
}

// ── Week-of-month position (calendar navigation + display) ─────────────────────

export interface MonthWeek {
  start: string
  end: string
}

/**
 * Enumerates every payroll week (Mon–Sun, or configured start day) belonging to
 * `year`-`month` (0-based, per JS `Date`), for calendar display purposes. A
 * week belongs to the month it starts in — the week containing next month's
 * day 1 belongs to that next month instead, so each week is assigned to
 * exactly one month, never both.
 */
export function weeksInMonth(year: number, month: number): MonthWeek[] {
  let cursor = firstWeekStart(year, month)
  const nextMonthStart = month === 11 ? firstWeekStart(year + 1, 0) : firstWeekStart(year, month + 1)

  const weeks: MonthWeek[] = []
  while (cursor !== nextMonthStart) {
    weeks.push({ start: cursor, end: addDays(cursor, 6) })
    cursor = addDays(cursor, 7)
  }
  return weeks
}

/** Resolves a week-start date's 1-based position (1st..5th) within the month it belongs to. */
export function weekOrdinalInMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const year = d.getFullYear()
  const month = d.getMonth()
  const candidates: Array<[number, number]> = [
    [year, month],
    month === 11 ? [year + 1, 0] : [year, month + 1],
    month === 0 ? [year - 1, 11] : [year, month - 1],
  ]
  for (const [y, m] of candidates) {
    const index = weeksInMonth(y, m).findIndex((w) => w.start === dateStr)
    if (index !== -1) return index + 1
  }
  return 1
}

const WEEK_ORDINAL_LABELS = ['1ra', '2da', '3ra', '4ta', '5ta']

/** Spanish ordinal abbreviation for a week's position within its month ("1ra", "2da", …). */
export function formatWeekOrdinal(ordinal: number): string {
  return WEEK_ORDINAL_LABELS[ordinal - 1] ?? `${ordinal}ta`
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Formats a full week title: "3ra sem. de Jun. [24] - 15 jun – 21 jun 2026". */
export function formatWeekTitle(start: string, end: string): string {
  const ordinal = formatWeekOrdinal(weekOrdinalInMonth(start))
  const { weekNumber } = weekNumberForDate(start)
  const monthAbbr = MONTH_NAMES_SHORT[new Date(`${start}T00:00:00`).getMonth()]
  return `${ordinal} sem. de ${monthAbbr}. [${weekNumber}] - ${formatWeekLabel(start, end)}`
}
