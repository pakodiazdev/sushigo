import type { StockMovementListParams } from '../types'

export const movementQueryKeys = {
  all: ['stock-movements'] as const,
  lists: () => [...movementQueryKeys.all, 'list'] as const,
  list: (params: StockMovementListParams) =>
    [
      ...movementQueryKeys.lists(),
      params.page ?? 1,
      params.per_page ?? '',
      params.location_id ?? '',
      params.item_variant_id ?? '',
      params.reason ?? '',
      params.status ?? '',
      params.date_from ?? '',
      params.date_to ?? '',
      params.search ?? '',
      params.source_type ?? '',
    ] as const,
  detail: (id: string) => [...movementQueryKeys.all, 'detail', id] as const,
}
