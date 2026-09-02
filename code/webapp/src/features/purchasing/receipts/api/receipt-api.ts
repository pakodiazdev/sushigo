import { apiClient } from '@/lib/api-client'
import type { EntityResponse, PaginatedResponse } from '@/types/inventory'
import type { Receipt, ReceiptListParams, ReceiptSummary } from '../types'

export interface ReceiptLinePayload {
  variant_purchase_presentation_id: string
  supplier_offering_id?: string | null
  ordered_packages?: number | null
  received_packages: number
  bonus_packages?: number | null
  // Sent as decimal strings, not numbers — see use-receipt-form.ts's moneyString convention
  // (matches VariantPrice's decimal(15,4) handling from #436). Laravel's `numeric` validation
  // rule accepts a numeric string exactly the same as a JSON number.
  gross_amount?: string | null
  discounts?: string | null
  allocated_expenses?: string | null
  non_recoverable_taxes?: string | null
}

export interface ReceiptPayload {
  supplier_id: string
  destination_location_id: string
  reference?: string | null
  receipt_date: string
  notes?: string | null
  lines: ReceiptLinePayload[]
}

export const receiptApi = {
  list: (params?: ReceiptListParams) =>
    apiClient.get<PaginatedResponse<ReceiptSummary>>('/inventory/receipts', { params }),

  get: (receiptId: string) =>
    apiClient.get<EntityResponse<Receipt>>(`/inventory/receipts/${receiptId}`),

  create: (data: ReceiptPayload) =>
    apiClient.post<EntityResponse<Receipt>>('/inventory/receipts', data),

  update: (receiptId: string, data: ReceiptPayload) =>
    apiClient.put<EntityResponse<Receipt>>(`/inventory/receipts/${receiptId}`, data),

  delete: (receiptId: string) => apiClient.delete(`/inventory/receipts/${receiptId}`),

  post: (receiptId: string) =>
    apiClient.post<EntityResponse<Receipt>>(`/inventory/receipts/${receiptId}/post`),

  reverse: (receiptId: string, data?: { reason?: string | null }) =>
    apiClient.post<EntityResponse<Receipt>>(`/inventory/receipts/${receiptId}/reverse`, data),
}
