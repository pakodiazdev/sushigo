export type EmployeeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type EmployeeRequestType = 'EXTRA_DAY' | 'LEAVE' | 'VACATION' | 'SCHEDULE_CHANGE'

export interface EmployeeRequest {
  id: string
  employee_id: string
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

export interface EmployeeRequestFilters {
  employee_id?: string
  type?: EmployeeRequestType
  status?: EmployeeRequestStatus
  per_page?: number
  sort?: string[]
}
