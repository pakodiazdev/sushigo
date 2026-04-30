import { apiClient } from '@/lib/api-client'
import type { PunctualityRange, UpdatePunctualityRangesPayload } from '@/types/punctuality'

export const punctualityConfigApi = {
  listRanges: () =>
    apiClient.get<{ status: number; data: PunctualityRange[] }>('/punctuality/ranges'),

  /** Full replacement — server computes max_seconds and sort_order from the sorted list. */
  updateRanges: (payload: UpdatePunctualityRangesPayload) =>
    apiClient.put<{ status: number; data: PunctualityRange[] }>('/punctuality/ranges', payload),
}
