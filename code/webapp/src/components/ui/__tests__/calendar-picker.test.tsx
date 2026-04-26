// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  CalendarDays: () => React.createElement('span', { 'data-testid': 'calendar-icon' }),
  ChevronLeft: () => React.createElement('span', { 'data-testid': 'chevron-left' }),
  ChevronRight: () => React.createElement('span', { 'data-testid': 'chevron-right' }),
}))

import { CalendarPicker } from '../calendar-picker'

// ── Helpers ────────────────────────────────────────────────────────────────────

const noop = vi.fn()

/** Find the trigger button by its stable aria-haspopup attribute */
function getTrigger(): HTMLElement {
  return document.querySelector('[aria-haspopup="dialog"]') as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

// ── Closed state ───────────────────────────────────────────────────────────────

describe('CalendarPicker — closed state', () => {
  it('renders the trigger button', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    expect(getTrigger()).toBeDefined()
  })

  it('shows default placeholder when value is empty', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    expect(screen.getByText('Seleccionar fecha')).toBeDefined()
  })

  it('accepts a custom placeholder', () => {
    render(<CalendarPicker value="" onChange={noop} placeholder="Elige un día" />)
    expect(screen.getByText('Elige un día')).toBeDefined()
  })

  it('shows formatted date when value is set', () => {
    render(<CalendarPicker value="2026-06-15" onChange={noop} />)
    // formatDisplay formats the ISO date — just check something date-related appears
    expect(screen.getByText(/2026/)).toBeDefined()
  })

  it('does not render the dropdown when closed', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sets aria-expanded=false on trigger when closed', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    const trigger = getTrigger()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})

// ── Open state ─────────────────────────────────────────────────────────────────

describe('CalendarPicker — open state', () => {
  it('opens the dropdown when trigger is clicked', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    fireEvent.click(getTrigger())
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('sets aria-expanded=true on trigger when open', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    const trigger = getTrigger()
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('toggles closed when trigger is clicked again', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    const trigger = getTrigger()
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when Escape key is pressed', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    fireEvent.click(getTrigger())
    expect(screen.getByRole('dialog')).toBeDefined()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows day-of-week headers (L M X J V S D) in day view', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    fireEvent.click(getTrigger())
    expect(screen.getByText('L')).toBeDefined()
    expect(screen.getByText('V')).toBeDefined()
    expect(screen.getByText('D')).toBeDefined()
  })

  it('renders navigation prev/next buttons', () => {
    render(<CalendarPicker value="" onChange={noop} />)
    fireEvent.click(getTrigger())
    expect(screen.getByLabelText('Anterior')).toBeDefined()
    expect(screen.getByLabelText('Siguiente')).toBeDefined()
  })
})

// ── Day selection ──────────────────────────────────────────────────────────────

describe('CalendarPicker — day selection', () => {
  it('calls onChange when a day is selected', () => {
    const onChange = vi.fn()
    // Use a known date so we can find a specific day button
    render(<CalendarPicker value="2026-06-01" onChange={onChange} />)
    fireEvent.click(getTrigger())
    // Click day 15
    fireEvent.click(screen.getByLabelText('2026-06-15'))
    expect(onChange).toHaveBeenCalledWith('2026-06-15')
  })

  it('closes the dropdown after a day is selected', () => {
    const onChange = vi.fn()
    render(<CalendarPicker value="2026-06-01" onChange={onChange} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByLabelText('2026-06-15'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('marks the selected date with aria-pressed=true', () => {
    render(<CalendarPicker value="2026-06-10" onChange={noop} />)
    fireEvent.click(getTrigger())
    const selected = screen.getByLabelText('2026-06-10')
    expect(selected.getAttribute('aria-pressed')).toBe('true')
  })
})

// ── Disabled days ─────────────────────────────────────────────────────────────

describe('CalendarPicker — disabled days of week', () => {
  it('disables all Monday buttons when disabledDaysOfWeek=[1]', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} disabledDaysOfWeek={[1]} />)
    fireEvent.click(getTrigger())
    // 2026-06-01 is a Monday → button with aria-label="2026-06-01" should be disabled
    const mondayBtn = screen.getByLabelText('2026-06-01')
    expect(mondayBtn).toHaveProperty('disabled', true)
  })

  it('does NOT disable a rest-day (day not in disabledDaysOfWeek)', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} disabledDaysOfWeek={[2, 3, 4, 5, 6, 7]} />)
    fireEvent.click(getTrigger())
    // Monday is day 1 (not in the disabled list) → should be enabled
    const mondayBtn = screen.getByLabelText('2026-06-01')
    expect(mondayBtn).toHaveProperty('disabled', false)
  })

  it('shows "Solo días de descanso" hint when disabled days are provided', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} disabledDaysOfWeek={[1, 2, 3, 4, 5]} />)
    fireEvent.click(getTrigger())
    expect(screen.getByText(/Solo días de descanso/)).toBeDefined()
  })

  it('does NOT show the hint when no days are disabled', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    expect(screen.queryByText(/Solo días de descanso/)).toBeNull()
  })
})

// ── Navigation ─────────────────────────────────────────────────────────────────

describe('CalendarPicker — month navigation', () => {
  it('navigates to previous month', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    expect(screen.getByText(/Junio 2026/)).toBeDefined()
    fireEvent.click(screen.getByLabelText('Anterior'))
    expect(screen.getByText(/Mayo 2026/)).toBeDefined()
  })

  it('navigates to next month', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByLabelText('Siguiente'))
    expect(screen.getByText(/Julio 2026/)).toBeDefined()
  })

  it('rolls over to next year when navigating forward from December', () => {
    render(<CalendarPicker value="2026-12-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByLabelText('Siguiente'))
    expect(screen.getByText(/Enero 2027/)).toBeDefined()
  })

  it('rolls back to previous year when navigating backward from January', () => {
    render(<CalendarPicker value="2026-01-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByLabelText('Anterior'))
    expect(screen.getByText(/Diciembre 2025/)).toBeDefined()
  })
})

// ── Month view ────────────────────────────────────────────────────────────────

describe('CalendarPicker — month view', () => {
  it('switches to month view when header label is clicked once', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    // Click the header label (shows month+year)
    fireEvent.click(screen.getByText(/Junio 2026/))
    // Month grid should show month abbreviations
    expect(screen.getByText('Ene')).toBeDefined()
    expect(screen.getByText('Dic')).toBeDefined()
  })

  it('goes back to day view after selecting a month', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByText(/Junio 2026/)) // → month view
    fireEvent.click(screen.getByText('Mar'))         // select March
    // Back in day view — look for day headers
    expect(screen.getByText('L')).toBeDefined()
  })
})

// ── Year view ─────────────────────────────────────────────────────────────────

describe('CalendarPicker — year view', () => {
  it('switches to year view when header clicked twice', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByText(/Junio 2026/)) // → month view
    fireEvent.click(screen.getByText('2026'))        // → year view
    // Year grid shows a range label (base=Math.floor(2026/12)*12=2016, end=2027)
    expect(screen.getByText(/2016\s*–\s*2027/)).toBeDefined()
  })

  it('navigates year pages with prev/next arrows', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByText(/Junio 2026/))
    fireEvent.click(screen.getByText('2026'))
    fireEvent.click(screen.getByLabelText('Siguiente'))
    // page1: 2028 – 2039
    expect(screen.getByText(/2028\s*–\s*2039/)).toBeDefined()
  })

  it('goes to month view after selecting a year', () => {
    render(<CalendarPicker value="2026-06-01" onChange={noop} />)
    fireEvent.click(getTrigger())
    fireEvent.click(screen.getByText(/Junio 2026/))
    fireEvent.click(screen.getByText('2026'))
    // Select a year in the current grid (2016-2027) — pick 2025
    const year2025 = screen.getAllByText('2025')[0]!
    fireEvent.click(year2025)
    // Should now be in month view for 2025
    expect(screen.getByText('2025')).toBeDefined()
    expect(screen.getByText('Ene')).toBeDefined()
  })
})
