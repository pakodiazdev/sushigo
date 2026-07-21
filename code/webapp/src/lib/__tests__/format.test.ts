import { describe, it, expect } from 'vitest'
import { formatCurrency, formatLastFirst, formatFirstLast, groupContiguousDates, formatDatesLabel } from '../format'

describe('formatCurrency', () => {
  it('formats a number as MXN currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })
})

describe('formatLastFirst', () => {
  it('joins last and first name with a comma', () => {
    expect(formatLastFirst({ first_name: 'Juan', last_name: 'Pérez' })).toBe('Pérez, Juan')
  })

  it('omits the comma when only last_name is present', () => {
    expect(formatLastFirst({ first_name: null, last_name: 'Pérez' })).toBe('Pérez')
  })

  it('omits the comma when only first_name is present', () => {
    expect(formatLastFirst({ first_name: 'Juan', last_name: null })).toBe('Juan')
  })

  it('returns an empty string when both parts are null', () => {
    expect(formatLastFirst({ first_name: null, last_name: null })).toBe('')
  })

  it('returns an empty string when user is null or undefined', () => {
    expect(formatLastFirst(null)).toBe('')
    expect(formatLastFirst(undefined)).toBe('')
  })
})

describe('formatFirstLast', () => {
  it('joins first and last name with a space', () => {
    expect(formatFirstLast({ first_name: 'Juan', last_name: 'Pérez' })).toBe('Juan Pérez')
  })

  it('omits the missing part instead of rendering "null"', () => {
    expect(formatFirstLast({ first_name: null, last_name: 'Pérez' })).toBe('Pérez')
    expect(formatFirstLast({ first_name: 'Juan', last_name: null })).toBe('Juan')
  })

  it('returns an empty string when both parts are null', () => {
    expect(formatFirstLast({ first_name: null, last_name: null })).toBe('')
  })

  it('returns an empty string when user is null or undefined', () => {
    expect(formatFirstLast(null)).toBe('')
    expect(formatFirstLast(undefined)).toBe('')
  })
})

describe('groupContiguousDates', () => {
  it('returns an empty array for no dates', () => {
    expect(groupContiguousDates([])).toEqual([])
  })

  it('groups a single date into one run', () => {
    expect(groupContiguousDates(['2026-04-13'])).toEqual([['2026-04-13']])
  })

  it('groups consecutive days into a single run', () => {
    expect(groupContiguousDates(['2026-04-13', '2026-04-14', '2026-04-15'])).toEqual([
      ['2026-04-13', '2026-04-14', '2026-04-15'],
    ])
  })

  it('splits non-contiguous days into separate runs', () => {
    expect(groupContiguousDates(['2026-04-13', '2026-04-15'])).toEqual([
      ['2026-04-13'],
      ['2026-04-15'],
    ])
  })

  it('sorts dates before grouping regardless of input order', () => {
    expect(groupContiguousDates(['2026-04-15', '2026-04-13', '2026-04-14'])).toEqual([
      ['2026-04-13', '2026-04-14', '2026-04-15'],
    ])
  })

  it('groups a contiguous run across a month boundary', () => {
    expect(groupContiguousDates(['2026-04-30', '2026-05-01'])).toEqual([
      ['2026-04-30', '2026-05-01'],
    ])
  })

  it('handles a mix of contiguous runs and isolated days', () => {
    expect(groupContiguousDates(['2026-04-13', '2026-04-14', '2026-04-17'])).toEqual([
      ['2026-04-13', '2026-04-14'],
      ['2026-04-17'],
    ])
  })
})

describe('formatDatesLabel', () => {
  it('formats a single date without a range dash', () => {
    const label = formatDatesLabel(['2026-04-13'])
    expect(label).not.toContain('—')
  })

  it('formats a contiguous run as a single "start — end" range', () => {
    const label = formatDatesLabel(['2026-04-13', '2026-04-14', '2026-04-15'])
    const single = formatDatesLabel(['2026-04-13'])
    const other = formatDatesLabel(['2026-04-15'])
    expect(label).toBe(`${single} — ${other}`)
  })

  it('formats non-contiguous days as two separate labels joined by a comma', () => {
    const label = formatDatesLabel(['2026-04-13', '2026-04-15'])
    const first = formatDatesLabel(['2026-04-13'])
    const second = formatDatesLabel(['2026-04-15'])
    expect(label).toBe(`${first}, ${second}`)
    expect(label).not.toContain('—')
  })
})
