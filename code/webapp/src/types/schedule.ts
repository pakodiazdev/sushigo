// Schedule Module Types

export type WorkdayType = 'FULL' | 'PARTIAL'

export interface ScheduleDay {
  day_of_week: number // ISO 8601: 1=Monday … 7=Sunday
  is_day_off: boolean
  expected_start: string | null        // 'HH:MM'
  expected_lunch_start: string | null  // 'HH:MM'
  expected_lunch_end: string | null    // 'HH:MM'
  lunch_duration_minutes: number | null
  expected_end: string | null          // 'HH:MM'
}

export interface EmployeeSchedule {
  id: string // ULID
  name: string
  effective_from: string  // 'YYYY-MM-DD'
  effective_to: string | null
  workday_type: WorkdayType
  working_days_per_week: number
  days: ScheduleDay[]
  created_at: string
  updated_at: string
}

// ── Form types ────────────────────────────────────────────────────────────────

export interface ScheduleDayFormValues {
  day_of_week: number
  is_day_off: boolean
  expected_start: string
  expected_lunch_start: string
  expected_lunch_end: string
  lunch_duration_minutes: string  // string for controlled input; converted to int on submit
  expected_end: string
}

export interface CreateScheduleFormValues {
  name: string
  effective_from: string
  workday_type: WorkdayType
  working_days_per_week: string  // string for select; converted to int on submit
  days: ScheduleDayFormValues[]
}

export const DAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export function buildEmptyDays(): ScheduleDayFormValues[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i + 1,
    is_day_off: i >= 5, // Sat & Sun off by default
    expected_start: '',
    expected_lunch_start: '',
    expected_lunch_end: '',
    lunch_duration_minutes: '',
    expected_end: '',
  }))
}
