// ── Holiday types ──────────────────────────────────────────────────────────────

export type HolidayType = 'obligatorio' | 'asueto' | 'opcional'
export type RecurrenceType = 'fixed' | 'nth_weekday' | 'floating' | 'none' | 'easter_offset'

export type RecurrenceConfig =
  | { month: number; day: number }                         // fixed
  | { month: number; week: number; weekday: number }       // nth_weekday
  | { offset: number }                                     // easter_offset (days from Easter Sunday)
  | Record<string, never>                                  // floating | none

// ── HolidayDefinition ─────────────────────────────────────────────────────────

export interface HolidayDefinition {
  id: number
  name: string
  description: string | null
  type: HolidayType
  pay_multiplier: number
  is_annual: boolean
  recurrence_type: RecurrenceType
  recurrence_config: RecurrenceConfig
  created_at: string
}

// ── Holiday (instance) ────────────────────────────────────────────────────────

export interface Holiday {
  id: number
  date: string             // 'YYYY-MM-DD'
  name: string
  type: HolidayType | null
  pay_multiplier: number
  is_auto_generated: boolean
  definition_id: number | null
  created_at: string       // ISO 8601 UTC
}

export interface HolidaysListMeta {
  warnings: string[]
}

// ── Payloads ───────────────────────────────────────────────────────────────────

export interface CreateHolidayPayload {
  date: string
  name: string
  pay_multiplier?: number
}

export interface UpdateHolidayPayload {
  date?: string
  name?: string
  type?: HolidayType
  pay_multiplier?: number
}

export interface CreateHolidayDefinitionPayload {
  name: string
  description?: string
  type: HolidayType
  pay_multiplier?: number
  is_annual: boolean
  recurrence_type: RecurrenceType
  recurrence_config: RecurrenceConfig
  date?: string
}

export type UpdateHolidayDefinitionPayload = Partial<CreateHolidayDefinitionPayload>

// ── Pay Period types ──────────────────────────────────────────────────────────

export type PayPeriodStatus = 'OPEN' | 'CLOSED' | 'REOPENED'

export type PayConcept =
  | 'BASE_PAY'
  | 'LATE_DEDUCTION'
  | 'UNPAID_LEAVE'
  | 'OVERTIME'
  | 'EXTRA_DAY'
  | 'PUNCTUALITY_BONUS'
  | 'HOLIDAY'
  | 'OTHER'

export interface PayPeriodLine {
  date: string | null
  concept: PayConcept
  description: string
  amount: number
  minutes: number | null
}

export interface PayPeriodEmployeePreview {
  employee: {
    id: string
    first_name: string
    last_name: string
    code: string
  }
  base_pay: number
  late_deductions: number
  unpaid_leave_deductions: number
  overtime_pay: number
  extra_day_pay: number
  punctuality_bonus: number
  holiday_pay: number
  other_adjustments: number
  total_pay: number
  free_hours_earned: number
  pay_period_lines: PayPeriodLine[]
}

export interface PayPeriodPreviewResponse {
  status: number
  data: PayPeriodEmployeePreview[]
}

// ── Vacation Entitlement ───────────────────────────────────────────────────────

export type TerminationType = 'resignation' | 'dismissal' | 'contract_end' | 'internal_transfer' | 'other'

export interface VacationEntitlement {
  id: number
  year: number
  entitled_days: number
  used_days: number
  remaining_days: number
  rule_key: string
}

export interface VacationSummary {
  seniority_years: number
  next_anniversary_date: string | null
}

// ── Overtime Pay Config ─────────────────────────────────────────────────────────

export type OvertimeValuationMethod = 'LFT_PROPORTIONAL' | 'AGREED_RATE'

export interface OvertimePayConfig {
  id: string
  valuation_method: OvertimeValuationMethod
  lft_factor: number | null
  hourly_rate: number | null
  effective_from: string
  effective_to: string | null
}

export interface SetOvertimeConfigPayload {
  valuation_method: OvertimeValuationMethod
  lft_factor?: number
  hourly_rate?: number
  effective_from: string
}
