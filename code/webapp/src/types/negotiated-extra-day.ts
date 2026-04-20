export interface NegotiatedExtraDay {
  id: string
  employee_id: string
  branch_id: number
  date: string
  agreed_daily_wage: number
  prima_percent: number
  prima_amount: number
  approved_by: string
  status: 'APPROVED'
  notes: string | null
}

export interface RegisterExtraDayPayload {
  employee_id: string
  date: string
  agreed_daily_wage: number
  prima_percent: number
  notes?: string
}
