// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ScheduleHistorySection } from '@/components/employees/schedule-history-section'
import { ScheduleHistoryItem } from '@/components/employees/schedule-history-item'
import type { EmployeeScheduleHistoryItem, ScheduleDay } from '@/types/schedule'

// Mock the schedule API
const mockGetHistory = vi.fn()
vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    getHistory: () => mockGetHistory(),
  },
}))

// Fire requestAnimationFrame callbacks synchronously
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDay(dow: number, isOff = false): ScheduleDay {
  return {
    day_of_week: dow,
    is_day_off: isOff,
    expected_start: isOff ? null : '09:00',
    expected_lunch_start: isOff ? null : '14:00',
    expected_lunch_end: isOff ? null : '15:00',
    lunch_duration_minutes: isOff ? null : 60,
    expected_end: isOff ? null : '18:00',
  }
}

const MON_FRI_DAYS = [
  makeDay(1), makeDay(2), makeDay(3), makeDay(4), makeDay(5),
  makeDay(6, true), makeDay(7, true),
]

const mockHistoryItem1: EmployeeScheduleHistoryItem = {
  id: 'sched-old',
  effective_from: '2025-01-01',
  effective_to: '2025-12-31',
  workday_type: 'FULL',
  working_days_per_week: 5,
  days: MON_FRI_DAYS,
  overrides: [],
  created_at: '2025-01-01T00:00:00+00:00',
  updated_at: '2025-01-01T00:00:00+00:00',
}

const mockHistoryItem2: EmployeeScheduleHistoryItem = {
  id: 'sched-older',
  effective_from: '2024-01-01',
  effective_to: '2024-12-31',
  workday_type: 'PARTIAL',
  working_days_per_week: 4,
  days: MON_FRI_DAYS,
  overrides: [
    {
      id: 'ovr-1',
      employment_period_id: 'period-1',
      day_of_week: 1,
      effective_from: '2024-03-15',
      effective_to: '2024-03-15',
      is_day_off: true,
      expected_start: null,
      expected_lunch_start: null,
      expected_lunch_end: null,
      lunch_duration_minutes: null,
      expected_end: null,
      note: 'Día festivo',
      created_at: '2024-03-01T00:00:00+00:00',
      updated_at: '2024-03-01T00:00:00+00:00',
    },
  ],
  created_at: '2024-01-01T00:00:00+00:00',
  updated_at: '2024-01-01T00:00:00+00:00',
}

const currentScheduleId = 'sched-current'

// ── Test wrapper ──────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScheduleHistorySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows loading state while fetching history', async () => {
    mockGetHistory.mockReturnValue(new Promise(() => {})) // Never resolves

    render(
      <ScheduleHistorySection periodId="period-1" currentScheduleId={currentScheduleId} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Cargando historial...')).toBeDefined()
  })

  it('renders nothing when no past schedules exist', async () => {
    mockGetHistory.mockResolvedValue({ data: { data: [] } })

    const { container } = render(
      <ScheduleHistorySection periodId="period-1" currentScheduleId={currentScheduleId} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('filters out current schedule from history', async () => {
    const historyWithCurrent: EmployeeScheduleHistoryItem = {
      ...mockHistoryItem1,
      id: currentScheduleId, // Same as current
    }
    mockGetHistory.mockResolvedValue({ data: { data: [historyWithCurrent] } })

    const { container } = render(
      <ScheduleHistorySection periodId="period-1" currentScheduleId={currentScheduleId} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('shows schedule history when past schedules exist', async () => {
    mockGetHistory.mockResolvedValue({ data: { data: [mockHistoryItem1, mockHistoryItem2] } })

    render(
      <ScheduleHistorySection periodId="period-1" currentScheduleId={currentScheduleId} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('Historial de horarios (2)')).toBeDefined()
    })
  })

  it('shows error state when fetch fails', async () => {
    mockGetHistory.mockRejectedValue(new Error('Network error'))

    render(
      <ScheduleHistorySection periodId="period-1" currentScheduleId={currentScheduleId} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByText('Error al cargar el historial de horarios.')).toBeDefined()
    })
  })

  it('does not fetch when periodId is null', () => {
    render(
      <ScheduleHistorySection periodId={null} currentScheduleId={currentScheduleId} />,
      { wrapper: createWrapper() }
    )

    expect(mockGetHistory).not.toHaveBeenCalled()
  })
})

describe('ScheduleHistoryItem', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders schedule date range', () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem1} isActive={false} />)

    // Check that the date range is displayed
    expect(screen.getByText(/01 ene 2025/)).toBeDefined()
    expect(screen.getByText(/31 dic 2025/)).toBeDefined()
  })

  it('shows "ACTIVO" badge when isActive is true', () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem1} isActive={true} />)

    expect(screen.getByText('ACTIVO')).toBeDefined()
  })

  it('does not show "ACTIVO" badge when isActive is false', () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem1} isActive={false} />)

    expect(screen.queryByText('ACTIVO')).toBeNull()
  })

  it('shows exception count in header when overrides exist', () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem2} isActive={false} />)

    expect(screen.getByText('1 excepción')).toBeDefined()
  })

  it('expands to show compact summary when clicked', async () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem1} isActive={false} />)

    // Click the header button to expand
    const expandBtn = screen.getAllByRole('button')[0] as HTMLElement
    await act(async () => { fireEvent.click(expandBtn) })

    // Now should show the compact summary line
    await waitFor(() => {
      expect(screen.getByText(/L-V/)).toBeDefined()
    })
  })

  it('shows overrides section when expanded', async () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem2} isActive={false} />)

    // Click the header button to expand
    const expandBtn = screen.getAllByRole('button')[0] as HTMLElement
    await act(async () => { fireEvent.click(expandBtn) })

    await waitFor(() => {
      expect(screen.getByText('Excepciones (1)')).toBeDefined()
    })
  })

  it('shows "Descanso" for day-off overrides', async () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem2} isActive={false} />)

    // Click the header button to expand
    const expandBtn = screen.getAllByRole('button')[0] as HTMLElement
    await act(async () => { fireEvent.click(expandBtn) })

    await waitFor(() => {
      expect(screen.getAllByText('Descanso').length).toBeGreaterThan(0)
    })
  })

  it('collapses when clicked again', async () => {
    render(<ScheduleHistoryItem schedule={mockHistoryItem1} isActive={false} />)

    const expandBtn = screen.getAllByRole('button')[0] as HTMLElement

    // Expand
    await act(async () => { fireEvent.click(expandBtn) })
    await waitFor(() => {
      expect(screen.getByText(/L-V/)).toBeDefined()
    })

    // Collapse
    await act(async () => { fireEvent.click(expandBtn) })
    await waitFor(() => {
      expect(screen.queryByText(/L-V/)).toBeNull()
    })
  })
})
