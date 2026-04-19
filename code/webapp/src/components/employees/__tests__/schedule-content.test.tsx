// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ScheduleContent } from '@/components/employees/schedule-content'
import type { EmployeeSchedule, ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── Mock heavy sub-components ──────────────────────────────────────────────────

vi.mock('@/components/employees/schedule-config-rows', () => ({
  ReadRow: ({ day }: { day: ScheduleDay }) => (
    <tr data-testid={`read-row-${day.day_of_week}`}><td>{day.day_of_week}</td></tr>
  ),
  EditRow: ({ day }: { day: ScheduleDay }) => (
    <tr data-testid={`edit-row-${day.day_of_week}`}><td>{day.day_of_week}</td></tr>
  ),
}))

vi.mock('@/components/employees/override-scope-dialog', () => ({
  OverrideScopeDialog: () => <div data-testid="override-scope-dialog" />,
}))

vi.mock('@/components/employees/weekly-calendar', () => ({
  WeeklyCalendar: () => <div data-testid="weekly-calendar" />,
}))

vi.mock('@/components/employees/override-list-dialog', () => ({
  OverrideListDialog: () => <div data-testid="override-list-dialog" />,
}))

vi.mock('@/components/employees/use-schedule-content', () => ({
  useScheduleContent: vi.fn(),
}))

import { useScheduleContent } from '@/components/employees/use-schedule-content'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeDay(dow: number, isOff = false): ScheduleDay {
  return {
    day_of_week: dow,
    is_day_off: isOff,
    expected_start: isOff ? null : '09:00',
    expected_lunch_start: isOff ? null : '13:00',
    expected_lunch_end: isOff ? null : '14:00',
    lunch_duration_minutes: isOff ? null : 60,
    expected_end: isOff ? null : '18:00',
  }
}

const MOCK_SCHEDULE: EmployeeSchedule = {
  id: 'sched-1',
  employment_period_id: 'period-1',
  effective_from: '2026-01-01',
  effective_to: null,
  workday_type: 'FULL',
  working_days_per_week: 5,
  days: [makeDay(1), makeDay(2), makeDay(3), makeDay(4), makeDay(5), makeDay(6, true), makeDay(7, true)],
  active_overrides: [],
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
}

const SORTED_DAYS = MOCK_SCHEDULE.days

function buildOverrideMock() {
  return {
    editingDow: null as number | null,
    editValues: null,
    editErrors: { expected_start: null, expected_end: null },
    hasEditErrors: false,
    isPending: false,
    isError: false,
    scopeOpen: false,
    startEdit: vi.fn(),
    cancelEdit: vi.fn(),
    updateEditField: vi.fn(),
    toggleDayOff: vi.fn(),
    openScopeDialog: vi.fn(),
    closeScopeDialog: vi.fn(),
    submit: vi.fn(),
    lunchOptions: [],
  }
}

function buildBaseMock(overrides: Partial<ReturnType<typeof useScheduleContent>> = {}) {
  return {
    override: buildOverrideMock(),
    weekStart: new Date('2026-03-30'),
    prevWeek: vi.fn(),
    nextWeek: vi.fn(),
    overrideListDow: null as number | null,
    openOverrideList: vi.fn(),
    closeOverrideList: vi.fn(),
    overridesByDow: {} as Record<number, ScheduleDayOverride[]>,
    sortedDays: SORTED_DAYS,
    todayLocal: '2026-03-31',
    findActivePermanentOverride: vi.fn().mockReturnValue(null),
    totalWeeklyHours: 40,
    expectedWeeklyHours: 40 as number | null,
    pendingHours: 0 as number | null,
    overridesForDow: [] as ScheduleDayOverride[],
    handleOverrideSelect: vi.fn(),
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ScheduleContent', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  beforeEach(() => {
    vi.mocked(useScheduleContent).mockReturnValue(buildBaseMock() as ReturnType<typeof useScheduleContent>)
  })

  describe('header summary row', () => {
    it('renders the "Desde" effective_from label', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).toContain('Desde')
    })

    it('renders workday_type FULL as "Jornada completa"', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).toContain('Jornada completa')
    })

    it('renders workday_type PARTIAL as "Jornada parcial"', () => {
      const partialSchedule: EmployeeSchedule = { ...MOCK_SCHEDULE, workday_type: 'PARTIAL' }
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({ expectedWeeklyHours: null, pendingHours: null }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={partialSchedule} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).toContain('Jornada parcial')
    })

    it('shows simple hours format when expectedWeeklyHours is null', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({ totalWeeklyHours: 36, expectedWeeklyHours: null, pendingHours: null }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).toContain('/sem')
    })

    it('shows "X de Y" hours format when expectedWeeklyHours is set', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({ totalWeeklyHours: 36, expectedWeeklyHours: 40, pendingHours: 4 }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).toContain('de')
    })

    it('shows pending hours label when pendingHours > 0', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({ totalWeeklyHours: 36, expectedWeeklyHours: 40, pendingHours: 4 }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).toContain('pendientes')
    })

    it('does not show pending hours label when pendingHours is 0', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({ totalWeeklyHours: 40, expectedWeeklyHours: 40, pendingHours: 0 }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.textContent).not.toContain('pendientes')
    })
  })

  describe('config view (default)', () => {
    it('renders the schedule table when viewMode is config', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.querySelector('table')).not.toBeNull()
    })

    it('renders ReadRow for each non-editing day', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      const rows = container.querySelectorAll('[data-testid^="read-row-"]')
      expect(rows.length).toBe(7) // all 7 days
    })

    it('renders EditRow for the day being edited', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({
          override: {
            ...buildOverrideMock(),
            editingDow: 1,
            editValues: {
              is_day_off: false,
              expected_start: '09:00',
              expected_lunch_start: '',
              lunch_duration_minutes: '',
              expected_end: '18:00',
            },
          },
        }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.querySelector('[data-testid="edit-row-1"]')).not.toBeNull()
    })

    it('renders OverrideScopeDialog when scopeOpen is true', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({
          override: {
            ...buildOverrideMock(),
            scopeOpen: true,
            editingDow: 1,
          },
        }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.querySelector('[data-testid="override-scope-dialog"]')).not.toBeNull()
    })

    it('does not render OverrideScopeDialog when scopeOpen is false', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.querySelector('[data-testid="override-scope-dialog"]')).toBeNull()
    })
  })

  describe('week view', () => {
    it('renders WeeklyCalendar when viewMode prop is week', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" viewMode="week" />
      )
      expect(container.querySelector('[data-testid="weekly-calendar"]')).not.toBeNull()
    })

    it('does not render the config table when viewMode prop is week', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" viewMode="week" />
      )
      expect(container.querySelector('table')).toBeNull()
    })
  })

  describe('override list dialog', () => {
    it('renders OverrideListDialog when overrideListDow is not null', () => {
      vi.mocked(useScheduleContent).mockReturnValue(
        buildBaseMock({ overrideListDow: 2 }) as ReturnType<typeof useScheduleContent>
      )
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.querySelector('[data-testid="override-list-dialog"]')).not.toBeNull()
    })

    it('does not render OverrideListDialog when overrideListDow is null', () => {
      const { container } = render(
        <ScheduleContent schedule={MOCK_SCHEDULE} employeeId="emp-1" periodId="period-1" />
      )
      expect(container.querySelector('[data-testid="override-list-dialog"]')).toBeNull()
    })
  })
})
