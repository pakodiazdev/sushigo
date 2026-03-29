// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { nextDateForDow, detectConflicts } from '@/components/employees/use-override-scope-dialog'
import type { ScheduleDayOverride } from '@/types/schedule'

// ── nextDateForDow ─────────────────────────────────────────────────────────────

describe('nextDateForDow', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = nextDateForDow(1)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a date that falls on the correct ISO day of week', () => {
    for (let dow = 1; dow <= 7; dow++) {
      const result = nextDateForDow(dow)
      const date = new Date(result + 'T00:00:00')
      // ISO: 1=Mon…7=Sun; JS: 0=Sun…6=Sat
      const jsDay = dow === 7 ? 0 : dow
      expect(date.getDay()).toBe(jsDay)
    }
  })

  it('returns today when today is the target day', () => {
    const today = new Date()
    const todayDow = today.getDay() === 0 ? 7 : today.getDay()
    const result = nextDateForDow(todayDow)
    const expected = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    expect(result).toBe(expected)
  })

  it('returns a date at most 6 days in the future', () => {
    const today = new Date()
    for (let dow = 1; dow <= 7; dow++) {
      const result = nextDateForDow(dow)
      const resultDate = new Date(result + 'T00:00:00')
      const diffDays = Math.round((resultDate.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
      expect(diffDays).toBeGreaterThanOrEqual(0)
      expect(diffDays).toBeLessThanOrEqual(6)
    }
  })
})

// ── detectConflicts ────────────────────────────────────────────────────────────

function makeOverride(id: string, from: string, to: string | null): ScheduleDayOverride {
  return {
    id,
    employment_period_id: 'period-01',
    day_of_week: 1,
    effective_from: from,
    effective_to: to,
    is_day_off: false,
    expected_start: '08:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '17:00',
    note: null,
    created_at: '2026-01-01T00:00:00+00:00',
    updated_at: '2026-01-01T00:00:00+00:00',
  }
}

describe('detectConflicts', () => {
  it('returns empty when there are no existing overrides', () => {
    expect(detectConflicts('2026-03-01', '2026-03-31', [])).toEqual([])
  })

  it('detects a direct overlap', () => {
    const existing = [makeOverride('a', '2026-03-10', '2026-03-20')]
    const result = detectConflicts('2026-03-15', '2026-03-25', existing)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a')
  })

  it('detects overlap when new range is fully contained within existing', () => {
    const existing = [makeOverride('a', '2026-03-01', '2026-03-31')]
    const result = detectConflicts('2026-03-10', '2026-03-20', existing)
    expect(result).toHaveLength(1)
  })

  it('detects overlap when existing range is fully contained within new', () => {
    const existing = [makeOverride('a', '2026-03-10', '2026-03-20')]
    const result = detectConflicts('2026-03-01', '2026-03-31', existing)
    expect(result).toHaveLength(1)
  })

  it('does not flag adjacent ranges (touching dates without overlap)', () => {
    const existing = [makeOverride('a', '2026-03-01', '2026-03-10')]
    // new range starts the day after existing ends — no overlap
    const result = detectConflicts('2026-03-11', '2026-03-20', existing)
    expect(result).toHaveLength(0)
  })

  it('treats null effective_to on new range as indefinite (+∞)', () => {
    const existing = [makeOverride('a', '2026-04-01', '2026-04-30')]
    const result = detectConflicts('2026-03-01', null, existing)
    expect(result).toHaveLength(1)
  })

  it('treats null effective_to on existing override as indefinite (+∞)', () => {
    const existing = [makeOverride('a', '2026-03-15', null)]
    const result = detectConflicts('2026-03-01', '2026-03-20', existing)
    expect(result).toHaveLength(1)
  })

  it('detects no conflict when new range is entirely before existing', () => {
    const existing = [makeOverride('a', '2026-04-01', '2026-04-30')]
    const result = detectConflicts('2026-03-01', '2026-03-31', existing)
    expect(result).toHaveLength(0)
  })

  it('detects no conflict when new range is entirely after existing', () => {
    const existing = [makeOverride('a', '2026-01-01', '2026-01-31')]
    const result = detectConflicts('2026-03-01', '2026-03-31', existing)
    expect(result).toHaveLength(0)
  })

  it('returns multiple conflicting overrides', () => {
    const existing = [
      makeOverride('a', '2026-03-01', '2026-03-10'),
      makeOverride('b', '2026-03-08', '2026-03-15'),
      makeOverride('c', '2026-04-01', '2026-04-30'),
    ]
    const result = detectConflicts('2026-03-05', '2026-03-12', existing)
    expect(result).toHaveLength(2)
    expect(result.map((o) => o.id)).toContain('a')
    expect(result.map((o) => o.id)).toContain('b')
  })
})
