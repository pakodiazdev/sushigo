import { apiClient } from '@/lib/api-client'
import type { OvertimeLftTier, UpdateOvertimeLftTiersPayload } from '@/types/attendance-payroll'

export const overtimeLftTiersApi = {
  list: () =>
    apiClient.get<{ status: number; data: OvertimeLftTier[] }>('/overtime/lft-tiers'),

  update: (payload: UpdateOvertimeLftTiersPayload) =>
    apiClient.put<{ status: number; data: OvertimeLftTier[] }>('/overtime/lft-tiers', payload),
}
