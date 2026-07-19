export type OvertimeValuationMethod = 'LFT_PROPORTIONAL' | 'AGREED_RATE' | 'SALARY_FACTOR'

/**
 * PATCH /attendances/{id}/overtime-decision body.
 * `valuation_method` (and the matching `agreed_rate`/`agreed_factor`) is only
 * meaningful — and required by the API — when `authorize` is true, so this is
 * modeled as a discriminated union instead of a loose bag of optional fields.
 */
export type OvertimeDecisionPayload =
  | { authorize: false; reason?: string }
  | { authorize: true; reason?: string; valuation_method: 'LFT_PROPORTIONAL' }
  | { authorize: true; reason?: string; valuation_method: 'AGREED_RATE'; agreed_rate: number }
  | { authorize: true; reason?: string; valuation_method: 'SALARY_FACTOR'; agreed_factor: number }

/**
 * POST /attendances/overtime-decisions/bulk body.
 * Applies the same OvertimeDecisionPayload to every attendance in `attendance_ids`.
 */
export type BulkOvertimeDecisionPayload = { attendance_ids: string[] } & OvertimeDecisionPayload

export interface BulkOvertimeDecisionResult {
  attendance_id: string
  success: boolean
  attendance: AttendanceRecord | null
  error: string | null
}

export interface BulkOvertimeDecisionResponse {
  results: BulkOvertimeDecisionResult[]
}

export interface OvertimeValuationPreview {
  valuation_method: OvertimeValuationMethod
  rate_applied: number
  amount: number
  accumulated_hours: number | null
}

export interface AttendanceRecord {
  id: string                           // ULID public_id
  employee_id: string
  date: string                         // 'YYYY-MM-DD'
  check_in: string | null              // ISO datetime
  lunch_start: string | null
  lunch_end: string | null
  check_out: string | null
  day_status: DayStatus
  entry_late_seconds: number | null
  entry_late_minutes: number | null
  is_entry_deductible: boolean
  lunch_late_seconds: number | null
  net_worked_minutes: number | null
  overtime_minutes: number
  overtime_authorized: boolean
  overtime_authorized_at: string | null
  overtime_valuation_method: OvertimeValuationMethod | null
  overtime_rate_applied: number | null
  overtime_amount: number | null
  requires_overtime_decision: boolean
  created_at: string
  updated_at: string
}

export type DayStatus =
  | 'WORKED'
  | 'DAY_OFF'
  | 'LEAVE'
  | 'VACATION'
  | 'HOLIDAY'
  | 'ABSENCE'
  | 'EXTRA'

export interface TodayScheduleDay {
  day_of_week: number
  is_day_off: boolean
  expected_start: string | null
  expected_lunch_start: string | null
  expected_lunch_end: string | null
  lunch_duration_minutes: number | null
  expected_end: string | null
}

export interface TodayLeave {
  id: string
  time_mode: 'SCHEDULED' | 'OPEN_ENDED'
  calculation_mode: 'FIXED_PERCENTAGE' | 'PROPORTIONAL_HOURS'
  is_paid: boolean
  starts_at: string | null  // ISO UTC — only for SCHEDULED leaves
  ends_at: string | null    // ISO UTC — only for SCHEDULED leaves
  note: string | null
}

export interface TodayAttendanceRow {
  employee: TodayAttendanceEmployee
  attendance: TodayAttendanceData | null
  schedule: TodayScheduleDay | null
  today_leave: TodayLeave | null
}

export interface TodayAttendanceEmployee {
  id: string         // ULID
  code: string
  first_name: string
  last_name: string
  roles: string[]
  /** Computed daily wage: hourly_rate × weekly_scheduled_hours / 6. Null when no wage is configured. */
  daily_wage: number | null
}

export interface TodayAttendanceData {
  id: string
  check_in: string | null
  lunch_start: string | null
  lunch_end: string | null
  check_out: string | null
  day_status: DayStatus
  entry_late_seconds: number | null
  entry_late_minutes: number | null
  is_entry_deductible: boolean
  overtime_minutes: number
  overtime_authorized: boolean
  overtime_authorized_at: string | null
  overtime_valuation_method: OvertimeValuationMethod | null
  overtime_rate_applied: number | null
  overtime_amount: number | null
  requires_overtime_decision: boolean
}

export interface TodayAttendanceResponse {
  status: number
  data: TodayAttendanceRow[]
}

// #region Close Day types

export interface CloseDayLunchReturn {
  attendance_id: string
  lunch_end: string // HH:mm
}

export interface CloseDayRequest {
  branch_id: number
  close_time: string // HH:mm
  lunch_returns?: CloseDayLunchReturn[]
}

export interface OvertimePendingEntry {
  attendance_id: string
  employee_name: string
  overtime_minutes: number
}

export interface CloseDayResponse {
  lunch_returns: number
  check_outs: number
  absences: number
  leaves: number
  day_offs: number
  overtime_pending?: OvertimePendingEntry[]
}

// #endregion

// #region Attendance state helpers

export type AttendancePhase =
  | 'pending'       // No check-in yet
  | 'checked-in'    // Has check_in, no check_out, no lunch_start
  | 'at-lunch'      // Has lunch_start, no lunch_end
  | 'returned'      // Has lunch_end, no check_out
  | 'done'          // Has check_out (with or without lunch)
  | 'on-leave'      // Formal leave (day_status = LEAVE)
  | 'day-off'       // Manually marked rest day (day_status = DAY_OFF)
  | 'absence'       // Manually marked no-show (day_status = ABSENCE)

export function getAttendancePhase(attendance: TodayAttendanceData | null): AttendancePhase {
  if (!attendance) return 'pending'
  if (attendance.day_status === 'LEAVE') return 'on-leave'
  if (attendance.day_status === 'DAY_OFF') return 'day-off'
  if (attendance.day_status === 'ABSENCE') return 'absence'
  if (!attendance.check_in) return 'pending'
  if (attendance.check_out) return 'done'
  if (!attendance.lunch_start) return 'checked-in'
  if (!attendance.lunch_end) return 'at-lunch'
  return 'returned'
}

/** Format seconds as "Xm" or "Xh Ym" */
export function formatSeconds(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0m'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** CDMX timezone offset (UTC-6 standard) */
const CDMX_OFFSET_HOURS = -6
const CDMX_OFFSET_MS = CDMX_OFFSET_HOURS * 60 * 60 * 1000

/** Days in each month (non-leap year) */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Check if a year is a leap year */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Pure mathematical calculation of milliseconds since Unix epoch.
 * Does NOT use any Date methods, avoiding cy.clock() mocking issues.
 */
function dateToMs(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
  // Count days from 1970 to the start of the given year
  let days = 0
  for (let y = 1970; y < year; y++) {
    days += isLeapYear(y) ? 366 : 365
  }

  // Add days for months before the given month (month is 1-indexed)
  for (let m = 1; m < month; m++) {
    days += DAYS_IN_MONTH[m - 1] ?? 0
    if (m === 2 && isLeapYear(year)) days += 1 // February in leap year
  }

  // Add the days of the current month (day is 1-indexed)
  days += day - 1

  // Convert to milliseconds
  return (
    days * 86400000 + // days to ms
    hour * 3600000 + // hours to ms
    minute * 60000 + // minutes to ms
    second * 1000 // seconds to ms
  )
}

/**
 * Parse an ISO 8601 datetime string manually to get UTC milliseconds since epoch.
 * Uses pure math - no Date methods - to avoid cy.clock() mocking issues.
 * Supports formats like: "2026-04-02T20:00:00+00:00", "2026-04-02T20:00:00Z"
 */
export function parseIsoToUtcMs(iso: string): number {
  // Match pattern: YYYY-MM-DDTHH:MM:SS with optional timezone
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))?$/.exec(iso)
  if (!match) return Number.NaN

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr, , sign, tzHourStr, tzMinuteStr] = match

  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const second = Number(secondStr)

  // Calculate UTC datetime using pure math
  let utcMs = dateToMs(year, month, day, hour, minute, second)

  // Adjust for timezone offset if present
  if (sign && tzHourStr && tzMinuteStr) {
    const offsetMs = (Number(tzHourStr) * 60 + Number(tzMinuteStr)) * 60 * 1000
    utcMs = sign === '+' ? utcMs - offsetMs : utcMs + offsetMs
  }

  return utcMs
}

/**
 * Convert a UTC/ISO 8601 datetime to CDMX "HH:mm" for display.
 * Uses pure mathematical ISO parsing to avoid cy.clock() mocking Date methods.
 * Accepts "2026-02-23T15:15:00+00:00" → shows "09:15" (CDMX = UTC-6).
 */
export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const timestamp = parseIsoToUtcMs(iso)
  if (Number.isNaN(timestamp)) return '—'
  // Calculate CDMX time by adding the offset to UTC timestamp
  const cdmxTimestamp = timestamp + CDMX_OFFSET_MS
  // Extract hours and minutes from the CDMX timestamp using modular arithmetic
  const totalMinutes = Math.floor(cdmxTimestamp / 60000)
  const totalHours = Math.floor(totalMinutes / 60)
  const hh = String(((totalHours % 24) + 24) % 24).padStart(2, '0')
  const mm = String(((totalMinutes % 60) + 60) % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

// #endregion
