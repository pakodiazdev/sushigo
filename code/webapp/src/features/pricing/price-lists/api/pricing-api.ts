import { apiClient } from '@/lib/api-client'
import type { EntityResponse, PaginatedResponse } from '@/types/inventory'
import type { PriceList, PriceListAssignment, PriceResolutionResult, VariantPrice } from '../types'

const api = apiClient

// Price Lists — top-level, not itself branch-owned. See
// doc/architecture/pricing/pricing-architecture.en.md §6.
export interface PriceListPayload {
  code: string
  name: string
  description?: string | null
  priority?: number
  is_active?: boolean
}

export const priceListApi = {
  list: (params?: { is_active?: boolean; per_page?: number; page?: number }) =>
    api.get<PaginatedResponse<PriceList>>('/pricing/price-lists', { params }),

  get: (id: string) => api.get<EntityResponse<PriceList>>(`/pricing/price-lists/${id}`),

  create: (data: PriceListPayload) =>
    api.post<EntityResponse<PriceList>>('/pricing/price-lists', data),

  update: (id: string, data: Partial<PriceListPayload>) =>
    api.put<EntityResponse<PriceList>>(`/pricing/price-lists/${id}`, data),

  delete: (id: string) => api.delete(`/pricing/price-lists/${id}`),
}

// Price List Assignments — the branch-scoped resource (Branch required, Operating Unit
// optional override). A flat top-level resource, not nested under /price-lists/{id} — see
// routes/api/pricing.php. `branch_id` is intentionally omitted from the update payload: the
// backend treats reassigning a Branch as a new authorization decision, not an update (delete +
// recreate instead).
export interface PriceListAssignmentPayload {
  price_list_id: string
  branch_id: number
  operating_unit_id?: number | null
  effective_from: string
  effective_to?: string | null
  is_active?: boolean
}

export interface PriceListAssignmentUpdatePayload {
  operating_unit_id?: number | null
  effective_from?: string
  effective_to?: string | null
  is_active?: boolean
}

export const priceListAssignmentApi = {
  list: (params?: { branch_id?: number; is_active?: boolean; per_page?: number; page?: number }) =>
    api.get<PaginatedResponse<PriceListAssignment>>('/pricing/price-list-assignments', { params }),

  create: (data: PriceListAssignmentPayload) =>
    api.post<EntityResponse<PriceListAssignment>>('/pricing/price-list-assignments', data),

  update: (id: string, data: PriceListAssignmentUpdatePayload) =>
    api.put<EntityResponse<PriceListAssignment>>(`/pricing/price-list-assignments/${id}`, data),

  delete: (id: string) => api.delete(`/pricing/price-list-assignments/${id}`),
}

// Variant Prices — nested under a Price List (not under an Assignment — see
// doc/architecture/pricing/pricing-architecture.en.md §1). `item_variant_id` is intentionally
// omitted from the update payload: a price entry that needs to price a different Variant is a
// new entry, not an edit of an existing one (its overlap validation is keyed on
// item_variant_id + price_list_id).
export interface VariantPricePayload {
  item_variant_id: string
  /** Exact decimal(15,4), sent as a string so it round-trips without float rounding. */
  price: string
  effective_from: string
  effective_to?: string | null
  is_active?: boolean
}

export interface VariantPriceUpdatePayload {
  price?: string
  effective_from?: string
  effective_to?: string | null
  is_active?: boolean
}

export const variantPriceApi = {
  list: (priceListId: string, params?: { per_page?: number; page?: number }) =>
    api.get<PaginatedResponse<VariantPrice>>(`/pricing/price-lists/${priceListId}/variant-prices`, { params }),

  create: (priceListId: string, data: VariantPricePayload) =>
    api.post<EntityResponse<VariantPrice>>(`/pricing/price-lists/${priceListId}/variant-prices`, data),

  update: (priceListId: string, variantPriceId: string, data: VariantPriceUpdatePayload) =>
    api.put<EntityResponse<VariantPrice>>(
      `/pricing/price-lists/${priceListId}/variant-prices/${variantPriceId}`,
      data
    ),

  delete: (priceListId: string, variantPriceId: string) =>
    api.delete(`/pricing/price-lists/${priceListId}/variant-prices/${variantPriceId}`),
}

// Resolution — GET /pricing/resolve always returns 200, even when `resolved: false` (see
// doc §3). Never falls back to ItemVariant.sale_price.
export interface ResolveVariantPriceParams {
  item_variant_id: string
  branch_id: number
  operating_unit_id?: number | null
  /** ISO date (YYYY-MM-DD). Defaults server-side to today in the business timezone when omitted. */
  as_of?: string
}

export const pricingResolveApi = {
  resolve: (params: ResolveVariantPriceParams) =>
    api.get<EntityResponse<PriceResolutionResult>>('/pricing/resolve', { params }),
}

export default api
