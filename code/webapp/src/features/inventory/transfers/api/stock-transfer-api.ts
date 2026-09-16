import { apiClient } from '@/lib/api-client'
import type { EntityResponse, PaginatedResponse } from '@/types/inventory'
import type {
  StockTransfer,
  StockTransferLinePreview,
  StockTransferListParams,
  StockTransferSummary,
} from '../types'

export interface StockTransferLinePayload {
  item_variant_id: string
  entry_uom_id: string
  entry_quantity: number
}

export interface StockTransferLinePreviewPayload {
  source_location_id: string
  item_variant_id: string
  entry_uom_id: string
  entry_quantity: number
}

export interface StockTransferPayload {
  source_location_id: string
  destination_location_id: string
  reference?: string | null
  transfer_date: string
  notes?: string | null
  lines: StockTransferLinePayload[]
}

export const stockTransferApi = {
  list: (params?: StockTransferListParams) =>
    apiClient.get<PaginatedResponse<StockTransferSummary>>('/inventory/transfers', { params }),

  get: (transferId: string) =>
    apiClient.get<EntityResponse<StockTransfer>>(`/inventory/transfers/${transferId}`),

  create: (data: StockTransferPayload) =>
    apiClient.post<EntityResponse<StockTransfer>>('/inventory/transfers', data),

  update: (transferId: string, data: StockTransferPayload) =>
    apiClient.put<EntityResponse<StockTransfer>>(`/inventory/transfers/${transferId}`, data),

  delete: (transferId: string) => apiClient.delete(`/inventory/transfers/${transferId}`),

  post: (transferId: string) =>
    apiClient.post<EntityResponse<StockTransfer>>(`/inventory/transfers/${transferId}/post`),

  reverse: (transferId: string, data?: { reason?: string | null }) =>
    apiClient.post<EntityResponse<StockTransfer>>(`/inventory/transfers/${transferId}/reverse`, data),

  /**
   * Non-mutating source-availability + base-UOM preview for one line (#613).
   * Same payload shape as a create/update line, plus the transfer's own
   * `source_location_id`.
   */
  preview: (data: StockTransferLinePreviewPayload) =>
    apiClient.post<EntityResponse<StockTransferLinePreview>>('/inventory/transfers/preview', data),
}
