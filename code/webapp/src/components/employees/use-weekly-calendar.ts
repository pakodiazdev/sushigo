import { useState } from 'react'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResolvedDay {
  date: string                        // YYYY-MM-DD
  dow: number                         // 1=Mon … 7=Sun
  source: 'base' | 'override'
  is_day_off: boolean
  expected_start: string | null
  expected_lunch_start: string | null
  lunch_duration_minutes: number | null
  expected_end: string | null
  override?: ScheduleDayOverride
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function getWeekStart(date: Date): string {
  const d = new Date(date)
  const jsDay = d.getDay() // 0=Sun
  const diff = jsDay === 0 ? -6 : 1 - jsDay // adjust to Monday
  d.setDate(d.getDate() + diff)
  return toDateStr(d)
}

export function fmtDayShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function getIsoDow(dateStr: string): number {
  const jsDay = new Date(dateStr + 'T00:00:00').getDay()
  return jsDay === 0 ? 7 : jsDay
}

// ── Resolver ──────────────────────────────────────────────────────────────────

export function resolveWeek(
  weekStart: string,
  baseDays: ScheduleDay[],
  overrides: ScheduleDayOverride[],
): ResolvedDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const dow = getIsoDow(date)
    const base = baseDays.find((d) => d.day_of_week === dow)

    // Most recently effective override active on this specific date
    const activeOverride = overrides
      .filter(
        (o) =>
          o.day_of_week === dow &&
          o.effective_from <= date &&
          (o.effective_to === null || o.effective_to >= date),
      )
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]

    if (activeOverride) {
      return {
        date,
        dow,
        source: 'override' as const,
        is_day_off: activeOverride.is_day_off,
        expected_start: activeOverride.expected_start,
        expected_lunch_start: activeOverride.expected_lunch_start,
        lunch_duration_minutes: activeOverride.lunch_duration_minutes,
        expected_end: activeOverride.expected_end,
        override: activeOverride,
      }
    }

    return {
      date,
      dow,
      source: 'base' as const,
      is_day_off: base?.is_day_off ?? true,
      expected_start: base?.expected_start ?? null,
      expected_lunch_start: base?.expected_lunch_start ?? null,
      lunch_duration_minutes: base?.lunch_duration_minutes ?? null,
      expected_end: base?.expected_end ?? null,
    }
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWeeklyCalendar() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [overrideListDow, setOverrideListDow] = useState<number | null>(null)

  return {
    weekStart,
    prevWeek: () => setWeekStart((prev) => addDays(prev, -7)),
    nextWeek: () => setWeekStart((prev) => addDays(prev, 7)),
    jumpToDate: (dateStr: string) =>
      setWeekStart(getWeekStart(new Date(dateStr + 'T00:00:00'))),
    overrideListDow,
    openOverrideList: (dow: number) => setOverrideListDow(dow),
    closeOverrideList: () => setOverrideListDow(null),
  }
}
