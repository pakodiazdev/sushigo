/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { WeekCalendar } from '../week-calendar'

beforeEach(() => {
  vi.useFakeTimers()
  // Wednesday within the week 2026-06-15 – 2026-06-21, kept consistent with
  // the fixed dates used throughout this file
  vi.setSystemTime(new Date('2026-06-17T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('WeekCalendar', () => {
  it('renders one row per week of the month containing periodStart', () => {
    // June 2026 has 5 weeks (week 5 spills into July)
    const { getAllByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={vi.fn()} />
    )
    expect(getAllByTestId('week-calendar-row')).toHaveLength(5)
  })

  it('marks the row matching periodStart as selected', () => {
    const { getAllByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={vi.fn()} />
    )
    const rows = getAllByTestId('week-calendar-row')
    const selected = rows.filter((row) => row.getAttribute('aria-pressed') === 'true')
    expect(selected).toHaveLength(1)
    // "3rd week of June [year week 24] - date range"
    expect(selected[0]!.getAttribute('title')).toBe('3ra sem. de Jun. [24] - 15 jun – 21 jun 2026')
  })

  it('calls onSelectDate with the week start when a row is clicked', () => {
    const onSelectDate = vi.fn()
    const { getAllByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={onSelectDate} />
    )
    const rows = getAllByTestId('week-calendar-row')
    fireEvent.click(rows[1]!) // week 2 (2026-06-08), a past week

    expect(onSelectDate).toHaveBeenCalledWith('2026-06-08')
  })

  it('disables weeks after the current one and ignores clicks on them', () => {
    const onSelectDate = vi.fn()
    // "Now" is mocked to 2026-06-17, so the current week starts 2026-06-15
    const { getAllByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={onSelectDate} />
    )
    const rows = getAllByTestId('week-calendar-row') as HTMLButtonElement[]
    // Rows: [06-01, 06-08, 06-15 (current), 06-22 (future), 06-29 (future)]
    expect(rows[3]!.disabled).toBe(true)
    expect(rows[4]!.disabled).toBe(true)
    expect(rows[2]!.disabled).toBe(false)

    fireEvent.click(rows[3]!)
    expect(onSelectDate).not.toHaveBeenCalled()
  })

  it('disables weeks before the employee hire date and ignores clicks on them', () => {
    const onSelectDate = vi.fn()
    // Hire date falls inside week 2 (2026-06-08 – 06-14), so week 1 (06-01) is out of bounds
    const { getAllByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart="2026-06-08" onSelectDate={onSelectDate} />
    )
    const rows = getAllByTestId('week-calendar-row') as HTMLButtonElement[]
    // Rows: [06-01 (before hire), 06-08 (hire week), 06-15 (current), 06-22, 06-29]
    expect(rows[0]!.disabled).toBe(true)
    expect(rows[1]!.disabled).toBe(false)
    expect(rows[2]!.disabled).toBe(false)

    fireEvent.click(rows[0]!)
    expect(onSelectDate).not.toHaveBeenCalled()
  })

  it('navigates to the previous/next month without changing the selection', () => {
    const { getByTestId, getAllByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={vi.fn()} />
    )
    expect(getByTestId('week-calendar').textContent).toContain('Junio 2026')

    fireEvent.click(getByTestId('week-calendar-next'))
    expect(getByTestId('week-calendar').textContent).toContain('Julio 2026')
    // July 2026 has 4 weeks, none selected (periodStart is still in June)
    const rows = getAllByTestId('week-calendar-row')
    expect(rows.filter((row) => row.getAttribute('aria-pressed') === 'true')).toHaveLength(0)

    fireEvent.click(getByTestId('week-calendar-prev'))
    expect(getByTestId('week-calendar').textContent).toContain('Junio 2026')
  })

  it('cycles from weeks to months view when the label is clicked, and jumps to a month', () => {
    const { getByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={vi.fn()} />
    )
    fireEvent.click(getByTestId('week-calendar-view-label'))
    expect(getByTestId('week-calendar-view-label').textContent).toBe('2026')

    const monthOptions = document.querySelectorAll('[data-testid="week-calendar-month-option"]')
    fireEvent.click(monthOptions[0]!) // Enero

    expect(getByTestId('week-calendar-view-label').textContent).toContain('Enero 2026')
  })

  it('cycles to years view and jumps to a different year', () => {
    const { getByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={vi.fn()} />
    )
    fireEvent.click(getByTestId('week-calendar-view-label')) // weeks -> months
    fireEvent.click(getByTestId('week-calendar-view-label')) // months -> years

    const yearOptions = document.querySelectorAll('[data-testid="week-calendar-year-option"]')
    const targetYear = yearOptions[0]!.textContent
    fireEvent.click(yearOptions[0]!)

    // Selecting a year moves to the months view for that year
    expect(getByTestId('week-calendar-view-label').textContent).toBe(targetYear)
  })

  it('prev/next shift by year while in the months view', () => {
    const { getByTestId } = render(
      <WeekCalendar periodStart="2026-06-15" earliestWeekStart={null} onSelectDate={vi.fn()} />
    )
    fireEvent.click(getByTestId('week-calendar-view-label')) // weeks -> months
    expect(getByTestId('week-calendar-view-label').textContent).toBe('2026')

    fireEvent.click(getByTestId('week-calendar-next'))
    expect(getByTestId('week-calendar-view-label').textContent).toBe('2027')

    fireEvent.click(getByTestId('week-calendar-prev'))
    fireEvent.click(getByTestId('week-calendar-prev'))
    expect(getByTestId('week-calendar-view-label').textContent).toBe('2025')
  })
})
