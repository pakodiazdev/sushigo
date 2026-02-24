// ============================================================================
// Attendance & Payroll — shared types
// ============================================================================

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
  requires_overtime_decision: boolean
  created_at: string
  updated_at: string
}

export type DayStatus =
  | 'WORKED'
  | 'ABSENT'
  | 'REST'
  | 'HOLIDAY'
  | 'VACATION'
  | 'LEAVE'

// Shape returned by GET /attendances/today per-row
export interface TodayAttendanceRow {
  employee: TodayAttendanceEmployee
  attendance: TodayAttendanceData | null
}

export interface TodayAttendanceEmployee {
  id: string         // ULID
  code: string
  first_name: string
  last_name: string
  roles: string[]
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
  requires_overtime_decision: boolean
}

// API response wrapper for today attendance list
export interface TodayAttendanceResponse {
  status: number
  data: TodayAttendanceRow[]
}

// ── Attendance state helpers ─────────────────────────────────────────────────

export type AttendancePhase =
  | 'pending'       // No check-in yet
  | 'checked-in'    // Has check_in, no lunch_start
  | 'at-lunch'      // Has lunch_start, no lunch_end
  | 'returned'      // Has lunch_end, no check_out
  | 'done'          // Has check_out

export function getAttendancePhase(attendance: TodayAttendanceData | null): AttendancePhase {
  if (!attendance || !attendance.check_in) return 'pending'
  if (!attendance.lunch_start) return 'checked-in'
  if (!attendance.lunch_end) return 'at-lunch'
  if (!attendance.check_out) return 'returned'
  return 'done'
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

/** Format "2026-02-23T09:15:00" → "09:15" */
export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  // ISO can be "2026-02-23T09:15:00" or "2026-02-23 09:15:00"
  const timePart = iso.replace('T', ' ').split(' ')[1] ?? ''
  return timePart.slice(0, 5)
}
