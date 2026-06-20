// ── Holiday types ──────────────────────────────────────────────────────────────

export type HolidayType = 'obligatorio' | 'asueto' | 'opcional'
export type RecurrenceType = 'fixed' | 'nth_weekday' | 'floating' | 'none'

export type RecurrenceConfig =
  | { month: number; day: number }                         // fixed
  | { month: number; week: number; weekday: number }       // nth_weekday
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
