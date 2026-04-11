// ── Enums ───────────────────────────────────────────────────────────────────────

export type LeaveCalculationMode = 'FIXED_PERCENTAGE' | 'PROPORTIONAL_HOURS'

export type RestDayFactor = 'FULL' | 'PROPORTIONAL' | 'NONE'

export type LeaveTimeMode = 'SCHEDULED' | 'OPEN_ENDED'

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

// ── Leave Type ──────────────────────────────────────────────────────────────────

export interface LeaveType {
  id: number
  code: string
  name: string
  calculation_mode: LeaveCalculationMode
  default_pay_percentage: number
  default_rest_day_factor: RestDayFactor
  counts_for_bonus: boolean
}

// ── Leave ───────────────────────────────────────────────────────────────────────

export interface Leave {
  id: string                              // ULID public_id
  employee_id: string
  leave_type: {
    id: number
    code: string
    name: string
    calculation_mode: LeaveCalculationMode
  }
  start_date: string                      // 'YYYY-MM-DD'
  end_date: string
  resolved_pay_percentage: number
  resolved_rest_day_factor: RestDayFactor
  time_mode: LeaveTimeMode | null
  scheduled_start_time: string | null     // 'HH:mm:ss'
  scheduled_end_time: string | null
  actual_start_time: string | null
  actual_end_time: string | null
  actual_duration_minutes: number | null
  computed_duration_minutes: number | null
  status: LeaveStatus
  requested_by: string
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
}

// ── API Request ─────────────────────────────────────────────────────────────────

export interface RegisterDirectLeaveRequest {
  employee_id: string
  leave_type_id: number
  start_date: string
  end_date: string
  pay_percentage?: number | null
  rest_day_factor?: RestDayFactor | null
  time_mode?: LeaveTimeMode | null
  scheduled_start_time?: string | null
  scheduled_end_time?: string | null
  actual_start_time?: string | null
  actual_end_time?: string | null
  notes?: string | null
}

// Leave request uses the same shape as direct registration
export type RegisterLeaveRequestData = RegisterDirectLeaveRequest
