// ── Holiday ───────────────────────────────────────────────────────────────────

export interface Holiday {
  id: number
  date: string          // 'YYYY-MM-DD'
  name: string
  pay_multiplier: number
  created_at: string    // ISO 8601 UTC
}

export interface CreateHolidayPayload {
  date: string
  name: string
  pay_multiplier?: number
}

export interface UpdateHolidayPayload {
  date?: string
  name?: string
  pay_multiplier?: number
}
