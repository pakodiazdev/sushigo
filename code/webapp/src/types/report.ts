/**
 * Operational status for an employee in today's report.
 *
 * arrived     — checked in on time (entry_late_seconds == 0)
 * late        — checked in late (entry_late_seconds > 0)
 * not_arrived — no check-in recorded yet
 * on_leave    — has an approved leave covering today
 * day_off     — attendance record exists with DAY_OFF status
 * rest_day    — today is a scheduled rest day per the employee's schedule (no attendance record)
 */
export type EmployeeOperationalStatus =
  | 'arrived'
  | 'late'
  | 'not_arrived'
  | 'on_leave'
  | 'day_off'
  | 'rest_day'

/** Per-employee row in today's operational report. */
export interface TodayReportEmployee {
  employee_id: string               // ULID public_id
  name: string                      // "{first_name} {last_name}"
  code: string
  role: string | null               // primary position role
  status: EmployeeOperationalStatus
  check_in_time: string | null      // ISO 8601 UTC, null when not checked in
  late_minutes: number | null       // null when no check-in; 0 when on time
  has_overtime: boolean
  overtime_authorized: boolean
}

/** Summary totals for today's report. */
export interface TodayReportSummary {
  total_employees: number
  arrived: number      // count of arrived + late employees
  not_arrived: number  // count of not_arrived + on_leave + day_off + rest_day employees
  late_count: number   // count of employees with late status
}

/** Full response payload for GET /api/v1/reports/today. */
export interface TodayReportResponse {
  summary: TodayReportSummary
  employees: TodayReportEmployee[]
}

// ── Weekly Summary ─────────────────────────────────────────────────────────────

export interface PartialLeaveItem {
  is_paid: boolean
  duration_minutes: number
}

export interface DailyEvidenceItem {
  date: string
  check_in: string | null
  check_out: string | null
  day_status: string | null   // null when no attendance record exists for this date yet
  late_minutes: number
  deducted_minutes: number
  partial_leaves: PartialLeaveItem[]
  overtime_minutes: number
  overtime_authorized: boolean
}

/** Full response payload for GET /api/v1/reports/weekly-summary. */
export interface WeeklySummaryResponse {
  employee_id: string
  period_start: string
  period_end: string
  base_pay: number
  late_deductions: number
  unpaid_leave_deductions: number
  overtime_pay: number
  extra_day_pay: number
  holiday_pay: number
  punctuality_bonus: number
  free_hours_earned: number
  total_pay: number
  daily_evidence: DailyEvidenceItem[]
}
