import { describe, it, expect } from 'vitest'
import { formatCurrency, groupContiguousDates, formatDatesLabel } from '../format'

describe('formatCurrency', () => {
  it('formats a number as MXN currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
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
