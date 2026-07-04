// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  ChevronLeft: () => React.createElement('span', { 'data-testid': 'chevron-left' }),
  ChevronRight: () => React.createElement('span', { 'data-testid': 'chevron-right' }),
  X: () => React.createElement('span', { 'data-testid': 'x-icon' }),
}))

import { MultiDateCalendar } from '../multi-date-calendar'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('MultiDateCalendar', () => {
  it('renders the month/year header for the first selected date', () => {
    render(<MultiDateCalendar value={['2026-06-15']} onChange={vi.fn()} />)
    expect(screen.getByText('Junio 2026')).toBeDefined()
  })

  it('marks the selected day as pressed', () => {
    render(<MultiDateCalendar value={['2026-06-15']} onChange={vi.fn()} />)
    const day = screen.getByLabelText('2026-06-15')
    expect(day.getAttribute('aria-pressed')).toBe('true')
  })

  it('adds a day to the selection when clicked', () => {
    const onChange = vi.fn()
    render(<MultiDateCalendar value={['2026-06-15']} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('2026-06-17'))

    expect(onChange).toHaveBeenCalledWith(['2026-06-15', '2026-06-17'])
  })

  it('removes a day from the selection when clicked again', () => {
    const onChange = vi.fn()
    render(<MultiDateCalendar value={['2026-06-15', '2026-06-17']} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('2026-06-17'))

    expect(onChange).toHaveBeenCalledWith(['2026-06-15'])
  })

  it('replaces the selection instead of adding when singleSelect is true', () => {
    const onChange = vi.fn()
    render(<MultiDateCalendar value={['2026-06-15']} onChange={onChange} singleSelect />)

    fireEvent.click(screen.getByLabelText('2026-06-17'))

    expect(onChange).toHaveBeenCalledWith(['2026-06-17'])
  })

  it('navigates to the next month', () => {
    render(<MultiDateCalendar value={['2026-06-15']} onChange={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Mes siguiente'))

    expect(screen.getByText('Julio 2026')).toBeDefined()
  })

  it('navigates to the previous month', () => {
    render(<MultiDateCalendar value={['2026-06-15']} onChange={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Mes anterior'))

    expect(screen.getByText('Mayo 2026')).toBeDefined()
  })

  it('renders a removable chip for each selected date', () => {
    render(<MultiDateCalendar value={['2026-06-15', '2026-06-17']} onChange={vi.fn()} />)

    expect(screen.getByLabelText('Quitar 2026-06-15')).toBeDefined()
    expect(screen.getByLabelText('Quitar 2026-06-17')).toBeDefined()
  })

  it('removes a date when its chip remove button is clicked', () => {
    const onChange = vi.fn()
    render(<MultiDateCalendar value={['2026-06-15', '2026-06-17']} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Quitar 2026-06-15'))

    expect(onChange).toHaveBeenCalledWith(['2026-06-17'])
  })

  it('renders no chips when nothing is selected', () => {
    render(<MultiDateCalendar value={[]} onChange={vi.fn()} />)
    expect(screen.queryByTestId('x-icon')).toBeNull()
  })
})
