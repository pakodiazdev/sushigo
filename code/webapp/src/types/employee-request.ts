export type EmployeeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type EmployeeRequestType = 'EXTRA_DAY' | 'LEAVE' | 'VACATION' | 'SCHEDULE_CHANGE'

export interface EmployeeRequest {
  id: string
  employee_id: string
  employee_name: string
  type: EmployeeRequestType
  status: EmployeeRequestStatus
  payload: Record<string, unknown> | null
  requestable: { id: string; type: string } | null
  requested_by: string
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  rejection_reason: string | null
  created_at: string
}

export interface ApproveEmployeeRequestData {
  salary_pct?: number
  salary_day?: number
  prima_pct?: number
  prima?: number
  seventh_day?: number
  total?: number
  /** LEAVE only — decided by the admin/manager at approval time, not at request creation */
  pay_percentage?: number
  notes?: string
}

export interface EmployeeRequestFilters {
  employee_id?: string
  type?: EmployeeRequestType
  status?: EmployeeRequestStatus | EmployeeRequestStatus[]
  branch_id?: number
  per_page?: number
  sort?: string[]
}

export interface ExtraDayPayload {
  date: string
  salary_pct: number
  prima_pct: number
  salary_day: number
  prima: number
  seventh_day: number
  total: number
}

export interface LeavePayload {
  leave_type_id: number
  /** Individual days this leave covers — not required to be contiguous */
  dates: string[]
  pay_percentage?: number | null
  rest_day_factor?: 'FULL' | 'PROPORTIONAL' | 'NONE' | null
  time_mode?: 'SCHEDULED' | 'OPEN_ENDED' | null
  scheduled_start_time?: string | null
  scheduled_end_time?: string | null
}

export interface VacationPayload {
  /** Individual days this vacation request covers — not required to be contiguous */
  dates: string[]
}

export type CreateEmployeeRequestData =
  | {
      employee_id: string
      type: 'EXTRA_DAY'
      auto_approve?: boolean
      notes?: string
      payload: ExtraDayPayload
    }
  | {
      employee_id: string
      type: 'LEAVE'
      auto_approve?: boolean
      notes?: string
      payload: LeavePayload
    }
  | {
      employee_id: string
      type: 'VACATION'
      auto_approve?: boolean
      notes?: string
      payload: VacationPayload
    }
