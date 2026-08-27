import { apiClient } from '@/lib/api-client'
import type { CollectionResponse, EntityResponse } from '@/types/inventory'
import type { ReplenishmentPolicy, ReplenishmentPolicyPayload } from '../types'

const base = (locationId: string) =>
  `/inventory-locations/${locationId}/replenishment-policies`

/**
 * Per-(Inventory Location, Variant) replenishment policy API (#439). Every
 * endpoint is scoped to a location; the write ones require `stock.manage`.
 */
export const replenishmentPolicyApi = {
  list: (locationId: string) =>
    apiClient.get<CollectionResponse<ReplenishmentPolicy>>(base(locationId)),

  /** Resolved policy for one variant — `is_configured: false` when none exists yet. */
  getResolved: (locationId: string, variantId: string) =>
    apiClient.get<EntityResponse<ReplenishmentPolicy>>(`${base(locationId)}/${variantId}`),

  upsert: (locationId: string, variantId: string, data: ReplenishmentPolicyPayload) =>
    apiClient.put<EntityResponse<ReplenishmentPolicy>>(`${base(locationId)}/${variantId}`, data),

  remove: (locationId: string, variantId: string) =>
    apiClient.delete(`${base(locationId)}/${variantId}`),
}
