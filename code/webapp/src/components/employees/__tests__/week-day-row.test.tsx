/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { WeekDayRow } from '../week-day-row'
import type { ResolvedDay } from '../use-weekly-calendar'

afterEach(() => {
  cleanup()
})

function createResolvedDay(overrides: Partial<ResolvedDay> = {}): ResolvedDay {
  return {
    date: '2026-03-30',
    dow: 1,
    source: 'base',
    is_day_off: false,
    expected_start: '13:00',
    expected_lunch_start: '16:00',
    lunch_duration_minutes: 60,
    expected_end: '22:00',
    ...overrides,
  }
}

describe('WeekDayRow', () => {
  it('renders working day with times', () => {
    const day = createResolvedDay()
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={() => {}} />
        </tbody>
      </table>
    )
    expect(container.textContent).toContain('Lunes')
    // Check that times are rendered (format depends on TIME_FORMAT)
    const cells = container.querySelectorAll('td')
    expect(cells.length).toBeGreaterThan(1)
  })

  it('renders day off row with Descanso text', () => {
    const day = createResolvedDay({ is_day_off: true, dow: 6 })
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={() => {}} />
        </tbody>
      </table>
    )
    expect(container.textContent).toContain('Sábado')
    expect(container.textContent).toContain('Descanso')
  })

  it('shows override indicator when source is override', () => {
    const day = createResolvedDay({ source: 'override' })
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={() => {}} />
        </tbody>
      </table>
    )
    // Should have the zap icon button
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
  })

  it('does not show override indicator for base days', () => {
    const day = createResolvedDay({ source: 'base' })
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={() => {}} />
        </tbody>
      </table>
    )
    const button = container.querySelector('button')
    expect(button).toBeNull()
  })

  it('calls onClickOverride when button is clicked', () => {
    const onClick = vi.fn()
    const day = createResolvedDay({ source: 'override' })
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={onClick} />
        </tbody>
      </table>
    )
    const button = container.querySelector('button')
    fireEvent.click(button!)
    expect(onClick).toHaveBeenCalled()
  })

  it('applies opacity class for day off rows', () => {
    const day = createResolvedDay({ is_day_off: true })
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={() => {}} />
        </tbody>
      </table>
    )
    const row = container.querySelector('tr')
    expect(row?.className).toContain('opacity-40')
  })

  it('applies amber background for override rows', () => {
    const day = createResolvedDay({ source: 'override' })
    const { container } = render(
      <table>
        <tbody>
          <WeekDayRow day={day} onClickOverride={() => {}} />
        </tbody>
      </table>
    )
    const row = container.querySelector('tr')
    expect(row?.className).toContain('bg-amber')
  })
})
