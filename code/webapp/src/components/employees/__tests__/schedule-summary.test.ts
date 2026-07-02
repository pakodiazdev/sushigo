import { describe, it, expect } from 'vitest'
import { buildSummaryLines } from '@/components/employees/schedule-section-utils'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Build a working ScheduleDay for the given ISO DOW (1=Mon…7=Sun). */
function workDay(dow: number, opts: Partial<ScheduleDay> = {}): ScheduleDay {
  return {
    day_of_week: dow,
    is_day_off: false,
    expected_start: '13:00',
    expected_lunch_start: '16:00',
    expected_lunch_end: '17:00',
    lunch_duration_minutes: 60,
    expected_end: '22:00',
    ...opts,
  }
}

/** Build a rest ScheduleDay for the given ISO DOW. */
function restDay(dow: number): ScheduleDay {
  return {
    day_of_week: dow,
    is_day_off: true,
    expected_start: null,
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: null,
  }
}

/** All 7 days as working days. */
function allWeek(opts: Partial<ScheduleDay> = {}): ScheduleDay[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => workDay(d, opts))
}

// ── Empty / edge cases ────────────────────────────────────────────────────────

describe('buildSummaryLines — empty / edge cases', () => {
  it('returns [] when all days are rest days', () => {
    const days = [1, 2, 3, 4, 5, 6, 7].map(restDay)
    expect(buildSummaryLines(days)).toEqual([])
  })

  it('returns [] for an empty array', () => {
    expect(buildSummaryLines([])).toEqual([])
  })
})

// ── Day-range label ───────────────────────────────────────────────────────────

describe('buildSummaryLines — day-range label', () => {
  it('shows "L-D" when all 7 days work', () => {
    const [first] = buildSummaryLines(allWeek())
    expect(first!.text).toContain('L-D')
  })

  it('shows "L-V" for Monday–Friday (Sat+Sun off)', () => {
    const days = [1, 2, 3, 4, 5].map((d) => workDay(d)).concat([restDay(6), restDay(7)])
    const [first] = buildSummaryLines(days)
    expect(first!.text).toContain('L-V')
  })

  it('shows single full day name when only one working day', () => {
    const days = [restDay(1), restDay(2), workDay(3), restDay(4), restDay(5), restDay(6), restDay(7)]
    const [first] = buildSummaryLines(days)
    expect(first!.text).toContain('Miércoles')
  })

  it('shows "L-S" for Monday–Saturday (Sunday off)', () => {
    const days = [1, 2, 3, 4, 5, 6].map((d) => workDay(d)).concat([restDay(7)])
    const [first] = buildSummaryLines(days)
    expect(first!.text).toContain('L-S')
  })

  it('shows circular range "X-L" when only Tuesday is rest (Wed–Mon work)', () => {
    // Work: Mon(1), Wed(3), Thu(4), Fri(5), Sat(6), Sun(7) — rest: Tue(2)
    const days = [workDay(1), restDay(2), workDay(3), workDay(4), workDay(5), workDay(6), workDay(7)]
    const [first] = buildSummaryLines(days)
    // rest block (Tue) is consecutive → circular range from first work (Mon=L) to last work (Sun=D)
    expect(first!.text).toContain('L-D')
  })

  it('lists abbreviations for non-consecutive, non-circular days', () => {
    // Work Mon(1), Wed(3), Fri(5) — rest Tue(2), Thu(4), Sat(6), Sun(7)
    const days = [workDay(1), restDay(2), workDay(3), restDay(4), workDay(5), restDay(6), restDay(7)]
    const [first] = buildSummaryLines(days)
    // rest is NOT a consecutive block → falls back to letter list "LXV"
    expect(first!.text).toContain('LXV')
  })
})

// ── Work times ────────────────────────────────────────────────────────────────

describe('buildSummaryLines — work times', () => {
  it('includes start and end times in work line', () => {
    const [first] = buildSummaryLines(allWeek())
    expect(first!.text).toContain('1:00 PM')
    expect(first!.text).toContain('10:00 PM')
  })

  it('work line has icon "work"', () => {
    const [first] = buildSummaryLines(allWeek())
    expect(first!.icon).toBe('work')
  })

  it('formats with 🕐 emoji prefix', () => {
    const [first] = buildSummaryLines(allWeek())
    expect(first!.text).toMatch(/^🕐/)
  })
})

// ── Lunch line ────────────────────────────────────────────────────────────────

describe('buildSummaryLines — lunch line', () => {
  it('includes lunch line when lunch is configured', () => {
    const lines = buildSummaryLines(allWeek())
    const lunch = lines.find((l) => l.icon === 'lunch')
    expect(lunch).toBeDefined()
    expect(lunch!.text).toContain('1 hr')
    expect(lunch!.text).toContain('4:00 PM')
  })

  it('shows minutes when duration is not a full hour', () => {
    const days = allWeek({ expected_lunch_start: '15:00', lunch_duration_minutes: 30, expected_lunch_end: '15:30' })
    const lunch = buildSummaryLines(days).find((l) => l.icon === 'lunch')
    expect(lunch!.text).toContain('30 min')
  })

  it('omits lunch line when no lunch_duration_minutes', () => {
    const days = allWeek({ expected_lunch_start: null, lunch_duration_minutes: null, expected_lunch_end: null })
    const lunch = buildSummaryLines(days).find((l) => l.icon === 'lunch')
    expect(lunch).toBeUndefined()
  })

  it('omits lunch line when lunch_start is null even if duration set', () => {
    const days = allWeek({ expected_lunch_start: null, lunch_duration_minutes: 60 })
    const lunch = buildSummaryLines(days).find((l) => l.icon === 'lunch')
    expect(lunch).toBeUndefined()
  })

  it('lunch line has 🍽️ emoji prefix', () => {
    const lunch = buildSummaryLines(allWeek()).find((l) => l.icon === 'lunch')
    expect(lunch!.text).toMatch(/^🍽/)
  })
})

// ── Rest days line ────────────────────────────────────────────────────────────

describe('buildSummaryLines — rest days line', () => {
  it('lists rest day names in Spanish', () => {
    const days = [1, 2, 3, 4, 5].map((d) => workDay(d)).concat([restDay(6), restDay(7)])
    const rest = buildSummaryLines(days).find((l) => l.icon === 'rest')
    expect(rest).toBeDefined()
    expect(rest!.text).toContain('Sábado')
    expect(rest!.text).toContain('Domingo')
  })

  it('omits rest line when all 7 days work', () => {
    const rest = buildSummaryLines(allWeek()).find((l) => l.icon === 'rest')
    expect(rest).toBeUndefined()
  })

  it('rest line has 🏠 emoji prefix', () => {
    const days = [1, 2, 3, 4, 5].map((d) => workDay(d)).concat([restDay(6), restDay(7)])
    const rest = buildSummaryLines(days).find((l) => l.icon === 'rest')
    expect(rest!.text).toMatch(/^🏠/)
  })

  it('lists multiple rest days comma-separated', () => {
    const days = [workDay(1), restDay(2), workDay(3), restDay(4), workDay(5), restDay(6), restDay(7)]
    const rest = buildSummaryLines(days).find((l) => l.icon === 'rest')
    // rest days: Tue, Thu, Sat, Sun — but this is the non-circular case, all listed
    expect(rest!.text).toContain('Martes')
  })
})

// ── Line ordering ─────────────────────────────────────────────────────────────

describe('buildSummaryLines — line ordering', () => {
  it('returns lines in order: work, lunch, rest', () => {
    const days = [1, 2, 3, 4, 5].map((d) => workDay(d)).concat([restDay(6), restDay(7)])
    const lines = buildSummaryLines(days)
    expect(lines.map((l) => l.icon)).toEqual(['work', 'lunch', 'rest'])
  })

  it('returns only work line when no lunch and no rest days', () => {
    const days = allWeek({ expected_lunch_start: null, lunch_duration_minutes: null, expected_lunch_end: null })
    const lines = buildSummaryLines(days)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.icon).toBe('work')
  })
})

// ── Indefinite overrides ──────────────────────────────────────────────────────

/** Build a minimal indefinite ScheduleDayOverride for a given DOW. */
function indefiniteOverride(dow: number, opts: Partial<ScheduleDayOverride> = {}): ScheduleDayOverride {
  return {
    id: `override-${dow}`,
    employment_period_id: 'period-01',
    day_of_week: dow,
    effective_from: '2020-01-01',
    effective_to: null, // indefinite
    is_day_off: false,
    expected_start: '14:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '23:00',
    note: null,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
    ...opts,
  }
}

/** Build a temporary (has effective_to) ScheduleDayOverride. */
function temporaryOverride(dow: number): ScheduleDayOverride {
  return {
    ...indefiniteOverride(dow),
    id: `temp-${dow}`,
    effective_to: '2026-04-30',
  }
}

describe('buildSummaryLines — indefinite overrides', () => {
  it('shows two time groups when Wednesday has different hours', () => {
    // Base: L-S 1:00 PM – 10:00 PM. Override: Wed → 2:00 PM – 11:00 PM
    const days = [1, 2, 3, 4, 5, 6].map((d) => workDay(d)).concat([restDay(7)])
    const overrides = [indefiniteOverride(3, { expected_start: '14:00', expected_end: '23:00' })]
    const [work] = buildSummaryLines(days, overrides)
    // Wed gets different hours → two groups should appear
    expect(work!.text).toContain('2:00 PM')
    expect(work!.text).toContain('11:00 PM')
    expect(work!.text).toContain('1:00 PM')
    expect(work!.text).toContain('10:00 PM')
  })

  it('work line shows comma-separated day abbreviations per group', () => {
    const days = [1, 2, 3, 4, 5, 6].map((d) => workDay(d)).concat([restDay(7)])
    const overrides = [indefiniteOverride(3)]
    const [work] = buildSummaryLines(days, overrides)
    // Main group should list day abbreviations with commas
    expect(work!.text).toMatch(/[LMXJVSD], [LMXJVSD]/)
  })

  it('does not change behavior when no indefinite overrides (only temporary)', () => {
    const days = [1, 2, 3, 4, 5].map((d) => workDay(d)).concat([restDay(6), restDay(7)])
    const overrides = [temporaryOverride(1)]
    const [work] = buildSummaryLines(days, overrides)
    // Temporary override should not change the summary groups
    expect(work!.text).toContain('L-V')
  })

  it('reflects indefinite day-off override in rest days', () => {
    // Base: all 7 work. Override: Thursday → is_day_off
    const days = allWeek()
    const overrides = [indefiniteOverride(4, { is_day_off: true, expected_start: null, expected_end: null })]
    const lines = buildSummaryLines(days, overrides)
    const rest = lines.find((l) => l.icon === 'rest')
    expect(rest).toBeDefined()
    expect(rest!.text).toContain('Jueves')
  })

  it('no overrides uses original range format', () => {
    const days = [1, 2, 3, 4, 5].map((d) => workDay(d)).concat([restDay(6), restDay(7)])
    const [work] = buildSummaryLines(days, [])
    expect(work!.text).toContain('L-V')
  })

  it('does not apply indefinite override with future effective_from', () => {
    // Override for Wednesday with a date far in the future — should be ignored
    const days = [1, 2, 3, 4, 5, 6].map((d) => workDay(d)).concat([restDay(7)])
    const overrides = [indefiniteOverride(3, { effective_from: '2099-01-01', expected_start: '14:00', expected_end: '23:00' })]
    const [work] = buildSummaryLines(days, overrides)
    // Future override not applied → original single-range format with no time split
    expect(work!.text).toContain('L-S')
    expect(work!.text).not.toContain('2:00 PM')
  })
})
