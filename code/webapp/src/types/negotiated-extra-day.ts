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

export interface ListExtraDaysFilters {
  date_from?: string
  date_to?: string
  per_page?: number
}

export interface PaginatedNegotiatedExtraDays {
  status: string
  data: NegotiatedExtraDay[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
