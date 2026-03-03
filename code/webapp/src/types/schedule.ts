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

export interface ScheduleDayOverride {
  id: string // ULID
  employment_period_id: string // ULID
  day_of_week: number // ISO 8601: 1=Monday … 7=Sunday
  effective_from: string  // 'YYYY-MM-DD'
  effective_to: string | null // null = indefinite
  is_day_off: boolean
  expected_start: string | null
  expected_lunch_start: string | null
  expected_lunch_end: string | null
  lunch_duration_minutes: number | null
  expected_end: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeSchedule {
  id: string // ULID
  employment_period_id: string // ULID of the employment period
  name: string
  effective_from: string  // 'YYYY-MM-DD'
  effective_to: string | null
  workday_type: WorkdayType
  working_days_per_week: number
  days: ScheduleDay[]
  active_overrides: ScheduleDayOverride[]
  created_at: string
  updated_at: string
}

// ── Form types ────────────────────────────────────────────────────────────────

export interface ScheduleDayFormValues {
  day_of_week: number
  is_day_off: boolean
  expected_start: string
  expected_lunch_start: string
  lunch_duration_minutes: string  // select value (string); converted to int on submit
  expected_end: string
}

// ── Lunch duration select options ─────────────────────────────────────────────

export const LUNCH_DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: '',    label: '— Sin comida —' },
  { value: '20',  label: '20 min' },
  { value: '30',  label: '30 min' },
  { value: '40',  label: '40 min' },
  { value: '60',  label: '1h' },
  { value: '80',  label: '1h 20min' },
  { value: '90',  label: '1h 30min' },
  { value: '100', label: '1h 40min' },
  { value: '120', label: '2h' },
]

export function formatLunchDuration(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  const opt = LUNCH_DURATION_OPTIONS.find((o) => o.value === String(minutes))
  return opt?.label ?? `${minutes} min`
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
    lunch_duration_minutes: '',
    expected_end: '',
  }))
}
