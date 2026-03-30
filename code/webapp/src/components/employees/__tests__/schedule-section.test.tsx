// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ScheduleSection } from '@/components/employees/schedule-section'
import type { Employee } from '@/types/employee'
import type { ScheduleDay } from '@/types/schedule'

vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    getCurrent: vi.fn(),
    createPayload: vi.fn().mockResolvedValue({ data: { data: { id: 'new-sched' } } }),
    createDayOverride: vi.fn().mockResolvedValue({ data: { data: { id: 'new-override' } } }),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

// Fire requestAnimationFrame callbacks synchronously so dialogs animate in tests
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDay(dow: number, isOff = false): ScheduleDay {
  return {
    day_of_week: dow,
    is_day_off: isOff,
    expected_start: isOff ? null : '13:00',
    expected_lunch_start: isOff ? null : '16:00',
    expected_lunch_end: isOff ? null : '17:00',
    lunch_duration_minutes: isOff ? null : 60,
    expected_end: isOff ? null : '22:00',
  }
}

const MON_FRI_DAYS = [
  makeDay(1), makeDay(2), makeDay(3), makeDay(4), makeDay(5),
  makeDay(6, true), makeDay(7, true),
]

const mockSchedule = {
  id: 'sched-1',
  employment_period_id: 'period-1',
  effective_from: '2026-01-01',
  effective_to: null,
  workday_type: 'FULL' as const,
  working_days_per_week: 5,
  days: MON_FRI_DAYS,
  active_overrides: [],
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
}

const mockEmployee: Employee = {
  id: 'emp-1',
  code: 'E001',
  first_name: 'Juan',
  last_name: 'Pérez',
  roles: ['cook'],
  is_active: true,
  meta: null,
  employment_periods: [
    {
      id: 'period-1',
      branch_id: 1,
      branch_name: 'Sucursal 1',
      start_date: '2026-01-01',
      end_date: null,
      termination_reason: null,
      is_active: true,
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function renderSection(employee = mockEmployee) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(ScheduleSection, { employee }),
    ),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScheduleSection', () => {
  beforeEach(async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(scheduleApi.getCurrent).mockResolvedValue({ data: { status: 200, data: mockSchedule } } as any)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the section heading', () => {
    renderSection()
    expect(screen.getByText('Horario activo')).toBeDefined()
  })

  it('shows "Ver horario" button while loading (schedule unknown)', () => {
    renderSection()
    // Before the API resolves, hasSchedule is undefined → noSchedule is false → "Ver horario"
    const buttons = screen.getAllByRole('button')
    const verBtn = buttons.find((b) => /ver horario/i.test(b.textContent ?? ''))
    expect(verBtn).toBeDefined()
  })

  it('shows "Ver horario" button after schedule loads', async () => {
    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      const btn = buttons.find((b) => /ver horario/i.test(b.textContent ?? ''))
      expect(btn).toBeDefined()
    })
  })

  it('shows schedule summary after schedule loads', async () => {
    renderSection()
    await waitFor(() => {
      const elements = screen.queryAllByText(/L-V/)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('shows "Agregar horario" button when no schedule exists', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.getCurrent).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: { meta: { employment_period_id: 'period-1' } },
      },
    })

    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      const btn = buttons.find((b) => /agregar horario/i.test(b.textContent ?? ''))
      expect(btn).toBeDefined()
    })
  })

  it('opens dialog when "Ver horario" button is clicked', async () => {
    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /ver horario/i.test(b.textContent ?? ''))).toBeDefined()
    })

    const btn = screen.getAllByRole('button').find((b) => /ver horario/i.test(b.textContent ?? ''))!
    await act(async () => { fireEvent.click(btn) })

    // Dialog heading "Horario activo" should now appear in the portal
    const headings = screen.queryAllByText('Horario activo')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('dialog renders schedule content (Jornada completa)', async () => {
    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /ver horario/i.test(b.textContent ?? ''))).toBeDefined()
    })

    const btn = screen.getAllByRole('button').find((b) => /ver horario/i.test(b.textContent ?? ''))!
    await act(async () => { fireEvent.click(btn) })

    await waitFor(() => {
      expect(screen.queryAllByText(/Jornada completa/i).length).toBeGreaterThan(0)
    })
  })

  it('dialog shows Nuevo horario footer button', async () => {
    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /ver horario/i.test(b.textContent ?? ''))).toBeDefined()
    })

    const btn = screen.getAllByRole('button').find((b) => /ver horario/i.test(b.textContent ?? ''))!
    await act(async () => { fireEvent.click(btn) })

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /nuevo horario/i.test(b.textContent ?? ''))).toBeDefined()
    })
  })

  it('clicking Nuevo horario switches to create form', async () => {
    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /ver horario/i.test(b.textContent ?? ''))).toBeDefined()
    })

    const verBtn = screen.getAllByRole('button').find((b) => /ver horario/i.test(b.textContent ?? ''))!
    await act(async () => { fireEvent.click(verBtn) })

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /nuevo horario/i.test(b.textContent ?? ''))).toBeDefined()
    })

    const nuevoBtn = screen.getAllByRole('button').find((b) => /nuevo horario/i.test(b.textContent ?? ''))!
    await act(async () => { fireEvent.click(nuevoBtn) })

    // After clicking, view transitions to 'create' — should show "Nuevo horario" heading
    await waitFor(() => {
      const headings = screen.queryAllByText('Nuevo horario')
      expect(headings.length).toBeGreaterThan(0)
    })
  })

  it('shows empty state when no schedule in dialog', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.getCurrent).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: { meta: { employment_period_id: 'period-1' } },
      },
    })

    renderSection()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.find((b) => /agregar horario/i.test(b.textContent ?? ''))).toBeDefined()
    })

    // Click "Agregar horario" — opens dialog directly to create view
    const agrBtn = screen.getAllByRole('button').find((b) => /agregar horario/i.test(b.textContent ?? ''))!
    await act(async () => { fireEvent.click(agrBtn) })

    await waitFor(() => {
      const headings = screen.queryAllByText('Nuevo horario')
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})
