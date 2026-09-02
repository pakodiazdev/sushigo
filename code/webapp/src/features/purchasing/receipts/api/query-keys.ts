import type { ReceiptListParams } from '../types'

export const receiptQueryKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptQueryKeys.all, 'list'] as const,
  list: (params: ReceiptListParams) =>
    [
      ...receiptQueryKeys.lists(),
      params.page ?? 1,
      params.per_page ?? '',
      params.status ?? '',
      params.supplier_id ?? '',
      params.destination_location_id ?? '',
      params.date_from ?? '',
      params.date_to ?? '',
      params.search ?? '',
    ] as const,
  detail: (id: string) => [...receiptQueryKeys.all, 'detail', id] as const,
}
