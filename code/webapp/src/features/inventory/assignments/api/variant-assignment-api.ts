import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/inventory'
import type { VariantAssignmentRow, VariantAssignmentState } from '../types'

const base = (locationId: string) =>
  `/inventory-locations/${locationId}/variant-assignments`

export interface ListVariantAssignmentsParams {
  state?: VariantAssignmentState
  search?: string
  per_page?: number
  page?: number
}

/**
 * Per-(Inventory Location, Variant) managed-assortment API (#569). The list is
 * variant-centric and paginated so it can drive a picker; the write endpoints
 * require `stock.manage` and never touch Stock or replenishment thresholds.
 */
export const variantAssignmentApi = {
  list: (locationId: string, params: ListVariantAssignmentsParams = {}) =>
    apiClient.get<PaginatedResponse<VariantAssignmentRow>>(base(locationId), { params }),

  assign: (locationId: string, variantId: string) =>
    apiClient.put(`${base(locationId)}/${variantId}`),

  unassign: (locationId: string, variantId: string) =>
    apiClient.delete(`${base(locationId)}/${variantId}`),
}
