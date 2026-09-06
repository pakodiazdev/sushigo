import type { StockTransferListParams } from '../types'

export const stockTransferQueryKeys = {
  all: ['stock-transfers'] as const,
  lists: () => [...stockTransferQueryKeys.all, 'list'] as const,
  list: (params: StockTransferListParams) =>
    [
      ...stockTransferQueryKeys.lists(),
      params.page ?? 1,
      params.per_page ?? '',
      params.status ?? '',
      params.source_location_id ?? '',
      params.destination_location_id ?? '',
      params.date_from ?? '',
      params.date_to ?? '',
      params.search ?? '',
    ] as const,
  detail: (id: string) => [...stockTransferQueryKeys.all, 'detail', id] as const,
}
