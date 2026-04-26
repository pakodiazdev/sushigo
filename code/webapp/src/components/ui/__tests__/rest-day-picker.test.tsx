// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'loader2' }),
}))

vi.mock('@/components/ui/calendar-picker', () => ({
  CalendarPicker: ({
    value,
    disabledDaysOfWeek,
    placeholder,
  }: {
    value: string
    disabledDaysOfWeek?: number[]
    placeholder?: string
  }) =>
    React.createElement('div', { 'data-testid': 'calendar-picker', 'data-value': value, 'data-disabled': JSON.stringify(disabledDaysOfWeek) }, placeholder ?? 'calendar'),
}))

vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    getCurrent: vi.fn(),
  },
}))

import { RestDayPicker } from '../rest-day-picker'

// ── Helpers ────────────────────────────────────────────────────────────────────

const noop = () => {}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RestDayPicker — loading state', () => {
  it('shows loading spinner while schedule is loading', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, data: undefined })
    render(<RestDayPicker employeeId="emp-1" value="" onChange={noop} />)
    expect(screen.getByTestId('loader2')).toBeDefined()
  })

  it('does not render CalendarPicker while loading', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, data: undefined })
    render(<RestDayPicker employeeId="emp-1" value="" onChange={noop} />)
    expect(screen.queryByTestId('calendar-picker')).toBeNull()
  })
})

describe('RestDayPicker — loaded state', () => {
  it('renders CalendarPicker when schedule has loaded', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: null })
    render(<RestDayPicker employeeId="emp-1" value="" onChange={noop} />)
    expect(screen.getByTestId('calendar-picker')).toBeDefined()
  })

  it('passes disabledDaysOfWeek = [] when schedule is null (employee has no schedule)', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: null })
    render(<RestDayPicker employeeId="emp-1" value="" onChange={noop} />)
    const picker = screen.getByTestId('calendar-picker')
    expect(picker.getAttribute('data-disabled')).toBe('[]')
  })

  it('disables working days (non-day-off) from the schedule', () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      data: {
        days: [
          { day_of_week: 1, is_day_off: false }, // Monday — work day → disabled
          { day_of_week: 2, is_day_off: false }, // Tuesday — work day → disabled
          { day_of_week: 0, is_day_off: true },  // Sunday — rest → NOT disabled
        ],
      },
    })
    render(<RestDayPicker employeeId="emp-1" value="" onChange={noop} />)
    const picker = screen.getByTestId('calendar-picker')
    expect(JSON.parse(picker.getAttribute('data-disabled') ?? '[]')).toEqual([1, 2])
  })

  it('passes the current value to CalendarPicker', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: null })
    render(<RestDayPicker employeeId="emp-1" value="2026-06-15" onChange={noop} />)
    const picker = screen.getByTestId('calendar-picker')
    expect(picker.getAttribute('data-value')).toBe('2026-06-15')
  })

  it('passes placeholder prop to CalendarPicker', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: null })
    render(<RestDayPicker employeeId="emp-1" value="" onChange={noop} placeholder="Elige un día" />)
    expect(screen.getByText('Elige un día')).toBeDefined()
  })
})

describe('RestDayPicker — query key', () => {
  it('queries the current-schedule endpoint for the given employeeId', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: null })
    render(<RestDayPicker employeeId="emp-42" value="" onChange={noop} />)
    const callArg = mockUseQuery.mock.calls[0][0] as { queryKey: unknown[] }
    expect(callArg.queryKey).toEqual(['employees', 'emp-42', 'current-schedule'])
  })

  it('disables the query when employeeId is empty', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: null })
    render(<RestDayPicker employeeId="" value="" onChange={noop} />)
    const callArg = mockUseQuery.mock.calls[0][0] as { enabled: boolean }
    expect(callArg.enabled).toBe(false)
  })
})
