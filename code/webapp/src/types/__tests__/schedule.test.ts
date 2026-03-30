import { describe, it, expect } from 'vitest'
import { formatLunchDuration, buildEmptyDays } from '@/types/schedule'

describe('formatLunchDuration', () => {
  it('returns — for null', () => {
    expect(formatLunchDuration(null)).toBe('—')
  })

  it('returns — for 0', () => {
    expect(formatLunchDuration(0)).toBe('—')
  })

  it('returns label for known option (60 min)', () => {
    expect(formatLunchDuration(60)).toBe('1h')
  })

  it('returns label for known option (30 min)', () => {
    expect(formatLunchDuration(30)).toBe('30 min')
  })

  it('returns fallback for unknown value', () => {
    expect(formatLunchDuration(45)).toBe('45 min')
  })
})

describe('buildEmptyDays', () => {
  it('returns 7 days', () => {
    expect(buildEmptyDays()).toHaveLength(7)
  })

  it('assigns day_of_week 1–7', () => {
    const days = buildEmptyDays()
    expect(days.map((d) => d.day_of_week)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('marks weekdays (Mon–Fri) as working', () => {
    const days = buildEmptyDays()
    const weekdays = days.filter((d) => d.day_of_week <= 5)
    expect(weekdays.every((d) => !d.is_day_off)).toBe(true)
  })

  it('marks weekend (Sat–Sun) as day off', () => {
    const days = buildEmptyDays()
    const weekend = days.filter((d) => d.day_of_week >= 6)
    expect(weekend.every((d) => d.is_day_off)).toBe(true)
  })

  it('initializes time fields as empty strings', () => {
    const days = buildEmptyDays()
    for (const d of days) {
      expect(d.expected_start).toBe('')
      expect(d.expected_end).toBe('')
    }
  })
})
