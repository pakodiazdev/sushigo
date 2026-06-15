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
