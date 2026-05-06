export interface PunctualityRange {
  id: string
  min_seconds: number
  max_seconds: number | null
  bonus_percentage: number
  sort_order: number
}

/** Full-replacement payload — server recomputes max_seconds and sort_order. */
export interface UpdatePunctualityRangesPayload {
  ranges: { min_seconds: number; bonus_percentage: number }[]
}

export interface PunctualityBonusGroup {
  id: string
  name: string
  weekly_bonus_amount: number
  working_days_divisor: number
  daily_bonus_amount: number
  is_active: boolean
}

export interface CreateBonusGroupPayload {
  name: string
  weekly_bonus_amount: number
  working_days_divisor: number
}

export interface EmployeeBonusConfig {
  id: string
  bonus_group_id: string
  bonus_group_name: string
  weekly_bonus_amount: number
  daily_bonus_amount: number
  effective_from: string
  effective_to: string | null
}

export interface AssignBonusConfigPayload {
  bonus_group_id: string
  effective_from: string
}
