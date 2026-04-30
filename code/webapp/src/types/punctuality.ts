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
