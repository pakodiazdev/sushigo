import type { ReceiptStatus } from '../types'

export const receiptQueryKeys = {
  all: ['receipts'] as const,
  list: (status?: ReceiptStatus | '', supplierId?: string) =>
    [...receiptQueryKeys.all, 'list', status ?? '', supplierId ?? ''] as const,
  detail: (id: string) => [...receiptQueryKeys.all, 'detail', id] as const,
}
