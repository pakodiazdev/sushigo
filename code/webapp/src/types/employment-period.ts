// Employment Period Module Types

export interface EmploymentPeriod {
  id: string // ULID public identifier
  branch_id: number
  branch_name: string
  start_date: string
  end_date: string | null
  termination_reason: string | null
  is_active: boolean
}
