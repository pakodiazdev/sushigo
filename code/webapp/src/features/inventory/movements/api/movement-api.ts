import { apiClient } from '@/lib/api-client'
import type { EntityResponse, PaginatedResponse } from '@/types/inventory'
import type { StockMovement, StockMovementListParams, StockMovementSummary } from '../types'

/**
 * Read-only client for the immutable Stock Movement ledger (#574). There is no
 * create/update/delete/reverse method by design — the ledger only ever reads.
 */
export const movementApi = {
  list: (params?: StockMovementListParams) =>
    apiClient.get<PaginatedResponse<StockMovementSummary>>('/inventory/movements', { params }),

  get: (movementId: string) =>
    apiClient.get<EntityResponse<StockMovement>>(`/inventory/movements/${movementId}`),
}
