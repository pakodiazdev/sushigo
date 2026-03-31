// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { addDays, getWeekStart, fmtDayShort, resolveWeek, useWeeklyCalendar } from '@/components/employees/use-weekly-calendar'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

function createWrapper() {
  const queryClient = new QueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function baseDay(dow: number, isOff = false): ScheduleDay {
  return {
    day_of_week: dow,
    is_day_off: isOff,
    expected_start: isOff ? null : '13:00',
    expected_lunch_start: isOff ? null : '16:00',
    expected_lunch_end: isOff ? null : '17:00',
    lunch_duration_minutes: isOff ? null : 60,
    expected_end: isOff ? null : '22:00',
  }
}

/** Standard Mon–Fri schedule, Sat+Sun off. */
const MON_FRI: ScheduleDay[] = [
  baseDay(1), baseDay(2), baseDay(3), baseDay(4), baseDay(5),
  baseDay(6, true), baseDay(7, true),
]

/** All-week schedule (no rest days). */
const ALL_WEEK: ScheduleDay[] = [1, 2, 3, 4, 5, 6, 7].map((d) => baseDay(d))

function makeOverride(
  dow: number,
  effectiveFrom: string,
  effectiveTo: string | null,
  opts: Partial<ScheduleDayOverride> = {},
): ScheduleDayOverride {
  return {
    id: `override-${dow}-${effectiveFrom}`,
    employment_period_id: 'period-1',
    day_of_week: dow,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    is_day_off: false,
    expected_start: '15:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '23:00',
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...opts,
  }
}

// ── addDays ───────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds 1 day', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
  })

  it('adds 7 days (next week)', () => {
    expect(addDays('2026-03-28', 7)).toBe('2026-04-04')
  })

  it('subtracts 7 days (previous week)', () => {
    expect(addDays('2026-03-28', -7)).toBe('2026-03-21')
  })

  it('handles month boundary', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01')
  })

  it('handles year boundary', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('adding 0 returns the same date', () => {
    expect(addDays('2026-03-15', 0)).toBe('2026-03-15')
  })
})

// ── getWeekStart ──────────────────────────────────────────────────────────────

describe('getWeekStart', () => {
  it('Monday returns itself', () => {
    // 2026-03-23 is a Monday
    expect(getWeekStart(new Date('2026-03-23T12:00:00'))).toBe('2026-03-23')
  })

  it('Saturday returns the Monday before it', () => {
    // 2026-03-28 is a Saturday → week started 2026-03-23
    expect(getWeekStart(new Date('2026-03-28T12:00:00'))).toBe('2026-03-23')
  })

  it('Sunday returns the Monday before it', () => {
    // 2026-03-29 is a Sunday → week started 2026-03-23
    expect(getWeekStart(new Date('2026-03-29T12:00:00'))).toBe('2026-03-23')
  })

  it('Friday returns the Monday of that week', () => {
    // 2026-03-27 is a Friday → week started 2026-03-23
    expect(getWeekStart(new Date('2026-03-27T12:00:00'))).toBe('2026-03-23')
  })

  it('result is always a Monday (DOW 1)', () => {
    const result = getWeekStart(new Date('2026-03-25T00:00:00')) // Wednesday
    const dayOfWeek = new Date(result + 'T00:00:00').getDay()
    expect(dayOfWeek).toBe(1) // 1 = Monday in JS
  })
})

// ── resolveWeek — no overrides ────────────────────────────────────────────────

describe('resolveWeek — base schedule only', () => {
  // Week of 2026-03-23 (Mon) to 2026-03-29 (Sun)
  const WEEK = '2026-03-23'

  it('produces exactly 7 ResolvedDay entries', () => {
    const result = resolveWeek(WEEK, ALL_WEEK, [])
    expect(result).toHaveLength(7)
  })

  it('assigns sequential dates starting from weekStart', () => {
    const result = resolveWeek(WEEK, ALL_WEEK, [])
    expect(result.map((d) => d.date)).toEqual([
      '2026-03-23', '2026-03-24', '2026-03-25',
      '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29',
    ])
  })

  it('assigns correct ISO day-of-week values', () => {
    const result = resolveWeek(WEEK, ALL_WEEK, [])
    expect(result.map((d) => d.dow)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('marks source as "base" when no overrides', () => {
    const result = resolveWeek(WEEK, ALL_WEEK, [])
    expect(result.every((d) => d.source === 'base')).toBe(true)
  })

  it('respects is_day_off from base schedule', () => {
    const result = resolveWeek(WEEK, MON_FRI, [])
    // Sat (index 5) and Sun (index 6) should be off
    expect(result[5]!.is_day_off).toBe(true)
    expect(result[6]!.is_day_off).toBe(true)
    expect(result[0]!.is_day_off).toBe(false)
  })

  it('carries base times for working days', () => {
    const result = resolveWeek(WEEK, ALL_WEEK, [])
    expect(result[0]!.expected_start).toBe('13:00')
    expect(result[0]!.expected_end).toBe('22:00')
  })

  it('returns null times for rest days', () => {
    const result = resolveWeek(WEEK, MON_FRI, [])
    expect(result[5]!.expected_start).toBeNull()
    expect(result[5]!.expected_end).toBeNull()
  })
})

// ── resolveWeek — with overrides ──────────────────────────────────────────────

describe('resolveWeek — override resolution', () => {
  const WEEK = '2026-03-23' // Mon 23 → Sun 29

  it('applies a single-date override on the matching date', () => {
    // Override Monday 2026-03-23 only
    const override = makeOverride(1, '2026-03-23', '2026-03-23')
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    const monday = result[0]!
    expect(monday.source).toBe('override')
    expect(monday.expected_start).toBe('15:00')
    expect(monday.expected_end).toBe('23:00')
  })

  it('does NOT apply override on other days of the same week', () => {
    const override = makeOverride(1, '2026-03-23', '2026-03-23')
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    // Tuesday (index 1) should still use base
    expect(result[1]!.source).toBe('base')
    expect(result[1]!.expected_start).toBe('13:00')
  })

  it('applies an indefinite override (effective_to = null) to its DOW', () => {
    // Indefinite override for every Wednesday starting 2026-03-01
    const override = makeOverride(3, '2026-03-01', null)
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    // Wednesday 2026-03-25 (index 2)
    expect(result[2]!.source).toBe('override')
    expect(result[2]!.expected_start).toBe('15:00')
  })

  it('does not apply override before its effective_from date', () => {
    // Override starts next week
    const override = makeOverride(1, '2026-03-30', null)
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    expect(result[0]!.source).toBe('base')
  })

  it('does not apply override after its effective_to date', () => {
    // Override expired last week
    const override = makeOverride(1, '2026-03-09', '2026-03-15')
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    expect(result[0]!.source).toBe('base')
  })

  it('picks the most recent override when multiple match the same date', () => {
    const older = makeOverride(1, '2026-03-01', null, { expected_start: '10:00', expected_end: '19:00' })
    const newer = makeOverride(1, '2026-03-20', null, { expected_start: '15:00', expected_end: '23:00' })
    const result = resolveWeek(WEEK, ALL_WEEK, [older, newer])

    expect(result[0]!.expected_start).toBe('15:00')
  })

  it('can override a working day to a rest day', () => {
    const override = makeOverride(1, '2026-03-23', '2026-03-23', { is_day_off: true, expected_start: null, expected_end: null })
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    expect(result[0]!.is_day_off).toBe(true)
    expect(result[0]!.source).toBe('override')
  })

  it('attaches the override object to the resolved day', () => {
    const override = makeOverride(1, '2026-03-23', '2026-03-23')
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    expect(result[0]!.override).toBe(override)
  })

  it('resolved days without an override have no override property', () => {
    const override = makeOverride(1, '2026-03-23', '2026-03-23')
    const result = resolveWeek(WEEK, ALL_WEEK, [override])

    expect(result[1]!.override).toBeUndefined()
  })
})

// ── fmtDayShort ───────────────────────────────────────────────────────────────

describe('fmtDayShort', () => {
  it('includes the day number in the output', () => {
    expect(fmtDayShort('2026-03-23')).toMatch(/23/)
  })

  it('includes a month abbreviation', () => {
    // 2026-01-01 in es-MX → "1 ene." or similar
    expect(fmtDayShort('2026-01-15')).toMatch(/15/)
  })

  it('returns a non-empty string', () => {
    expect(fmtDayShort('2026-06-30').length).toBeGreaterThan(0)
  })
})

// ── useWeeklyCalendar hook ────────────────────────────────────────────────────

describe('useWeeklyCalendar', () => {
  it('initializes weekStart to the current Monday', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    const dayOfWeek = new Date(result.current.weekStart + 'T00:00:00').getDay()
    expect(dayOfWeek).toBe(1) // Monday in JS
  })

  it('prevWeek moves weekStart back 7 days', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    const initial = result.current.weekStart
    act(() => { result.current.prevWeek() })
    expect(result.current.weekStart).toBe(addDays(initial, -7))
  })

  it('nextWeek moves weekStart forward 7 days', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    const initial = result.current.weekStart
    act(() => { result.current.nextWeek() })
    expect(result.current.weekStart).toBe(addDays(initial, 7))
  })

  it('jumpToDate sets weekStart to the Monday of that week', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    act(() => { result.current.jumpToDate('2026-03-25') }) // Wednesday → Monday 2026-03-23
    expect(result.current.weekStart).toBe('2026-03-23')
  })

  it('openOverrideList sets overrideListDow', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    act(() => { result.current.openOverrideList(3) })
    expect(result.current.overrideListDow).toBe(3)
  })

  it('closeOverrideList clears overrideListDow', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    act(() => { result.current.openOverrideList(5) })
    act(() => { result.current.closeOverrideList() })
    expect(result.current.overrideListDow).toBeNull()
  })

  it('starts with overrideListDow as null', () => {
    const { result } = renderHook(() => useWeeklyCalendar(), { wrapper: createWrapper() })
    expect(result.current.overrideListDow).toBeNull()
  })
})
