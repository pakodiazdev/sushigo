/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { WeeklySummaryDialog } from '../WeeklySummaryDialog'

afterEach(() => {
  cleanup()
  document.body.style.overflow = 'unset'
})

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  employeeName: 'Mendoza, Carlos',
  periodStart: '2026-06-15',
  periodEnd: '2026-06-21',
  onPrevWeek: vi.fn(),
  onNextWeek: vi.fn(),
  onJumpToDate: vi.fn(),
  isCurrentWeek: true,
  isEarliestWeek: false,
  earliestWeekStart: null,
  onGoToCurrentWeek: vi.fn(),
  summary: null,
  isLoading: false,
  isError: false,
}

describe('WeeklySummaryDialog — calendar toggle', () => {
  it('hides the calendar by default', () => {
    const { queryByTestId, getByTestId } = render(<WeeklySummaryDialog {...defaultProps} />)
    expect(queryByTestId('week-calendar')).toBeNull()
    expect(getByTestId('dialog-week-label').getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the calendar when the week label is clicked', () => {
    const { getByTestId } = render(<WeeklySummaryDialog {...defaultProps} />)

    fireEvent.click(getByTestId('dialog-week-label'))

    expect(getByTestId('week-calendar')).toBeDefined()
    expect(getByTestId('dialog-week-label').getAttribute('aria-expanded')).toBe('true')
  })

  it('hides the calendar again on a second click', () => {
    const { getByTestId, queryByTestId } = render(<WeeklySummaryDialog {...defaultProps} />)

    fireEvent.click(getByTestId('dialog-week-label'))
    expect(getByTestId('week-calendar')).toBeDefined()

    fireEvent.click(getByTestId('dialog-week-label'))
    expect(queryByTestId('week-calendar')).toBeNull()
    expect(getByTestId('dialog-week-label').getAttribute('aria-expanded')).toBe('false')
  })
})
