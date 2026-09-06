// Internal Stock Transfers (#573), against the StockTransfer/StockTransferLine backend contract —
// see code/api/app/Http/Resources/Inventory/StockTransfer/{StockTransferResource,
// StockTransferLineResource,StockTransferSummaryResource}.php.
export type StockTransferStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export interface StockTransferLocationRef {
  id: string
  name: string
}

export interface StockTransferUserRef {
  id: number
  name: string
}

export interface StockTransferVariantRef {
  id: string
  code: string
  name: string
}

export interface StockTransferUomRef {
  id: string
  code: string
  symbol: string
}

export interface StockTransferLine {
  id: string
  variant: StockTransferVariantRef | null
  entry_uom: StockTransferUomRef | null
  entry_quantity: number
  conversion_factor: number
  base_quantity: number
  /** Source weighted-average cost snapshot, filled in at posting; null while DRAFT. */
  source_unit_cost: number | null
}

export interface StockTransfer {
  id: string
  status: StockTransferStatus
  reference: string | null
  transfer_date: string
  notes: string | null
  source_location: StockTransferLocationRef | null
  destination_location: StockTransferLocationRef | null
  lines: StockTransferLine[]
  posted_at: string | null
  posted_by: StockTransferUserRef | null
  reversed_at: string | null
  reversed_by: StockTransferUserRef | null
  reversal_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * Bounded history row from GET /inventory/transfers. The list is a summary read
 * model — it carries a `line_count` aggregate instead of the `lines` array and
 * the per-user posted_by / reversed_by refs. Full evidence is fetched from the
 * detail endpoint (stockTransferApi.get) when a row is opened.
 */
export interface StockTransferSummary {
  id: string
  status: StockTransferStatus
  reference: string | null
  transfer_date: string
  notes: string | null
  line_count: number
  source_location: StockTransferLocationRef | null
  destination_location: StockTransferLocationRef | null
  posted_at: string | null
  reversed_at: string | null
  created_at: string
  updated_at: string
}

export interface StockTransferListParams {
  page?: number
  per_page?: number
  status?: StockTransferStatus
  source_location_id?: string
  destination_location_id?: string
  date_from?: string
  date_to?: string
  search?: string
}
