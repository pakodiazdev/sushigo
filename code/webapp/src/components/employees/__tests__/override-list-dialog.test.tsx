/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { OverrideListDialog } from '../override-list-dialog'
import type { ScheduleDayOverride } from '@/types/schedule'

describe('OverrideListDialog', () => {
  const mockOnSelect = vi.fn()
  const mockOnClose = vi.fn()

  const mockOverrides: ScheduleDayOverride[] = [
    {
      id: 1,
      employee_id: 1,
      day_of_week: 1,
      effective_date: '2025-01-20',
      expected_start: '09:00',
      expected_end: '18:00',
      lunch_duration_minutes: 60,
      is_day_off: false,
      note: 'Special schedule',
      created_at: '2025-01-01T00:00:00+00:00',
      updated_at: '2025-01-01T00:00:00+00:00',
    },
    {
      id: 2,
      employee_id: 1,
      day_of_week: 1,
      effective_date: '2025-01-27',
      expected_start: null,
      expected_end: null,
      lunch_duration_minutes: null,
      is_day_off: true,
      note: 'Day off',
      created_at: '2025-01-01T00:00:00+00:00',
      updated_at: '2025-01-01T00:00:00+00:00',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders dialog title with day label', () => {
    render(
      <OverrideListDialog
        dow={1}
        dayLabel="Lunes"
        overrides={mockOverrides}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    )

    expect(screen.getByText('Excepciones — Lunes')).toBeDefined()
  })

  it('shows empty message when no overrides', () => {
    render(
      <OverrideListDialog
        dow={1}
        dayLabel="Lunes"
        overrides={[]}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    )

    expect(screen.getByText('Sin excepciones activas.')).toBeDefined()
  })

  it('renders override with day off label', () => {
    render(
      <OverrideListDialog
        dow={1}
        dayLabel="Lunes"
        overrides={mockOverrides}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    )

    expect(screen.getByText('Descanso')).toBeDefined()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(
      <OverrideListDialog
        dow={1}
        dayLabel="Lunes"
        overrides={mockOverrides}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    )

    const closeButton = screen.getByRole('button', { name: /cerrar/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <OverrideListDialog
        dow={1}
        dayLabel="Lunes"
        overrides={mockOverrides}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    )

    expect(container).toBeDefined()
  })
})
