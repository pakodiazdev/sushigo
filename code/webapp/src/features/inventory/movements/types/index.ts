// Immutable Inventory Stock Movement ledger (#574), against the read-only
// backend contract from
// code/api/app/Http/Resources/Inventory/StockMovement/{StockMovementResource,StockMovementSummaryResource}.php.
// The ledger never creates, edits, reverses or recomputes anything — every
// endpoint here is a pure read.

export type MovementStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export type MovementReason =
  | 'TRANSFER'
  | 'RETURN'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'CONSUMPTION'
  | 'OPENING_BALANCE'
  | 'COUNT_VARIANCE'
  | 'PURCHASE_RECEIPT'
  | 'PURCHASE_RECEIPT_REVERSAL'

/** Derived movement kind — never the removed legacy `type` column. */
export type MovementDirection = 'entry' | 'exit' | 'transfer' | 'adjustment'

/** Source document types the `source_type` filter accepts today. */
export type MovementSourceType = 'receipt'

export interface MovementLocationRef {
  id: string
  name: string
}

export interface MovementUomRef {
  id: string
  code: string
  name: string
  symbol: string | null
}

export interface MovementVariantRef {
  id: string
  code: string
  name: string
  base_uom: MovementUomRef | null
}

export interface MovementActorRef {
  id: number
  name: string
}

export interface MovementSourceRef {
  type: string
  /** The origin document's public ULID — null for a hard-deleted source. */
  id: string | null
}

export interface MovementLinkRef {
  id: string
  reason: MovementReason
  status: MovementStatus
  posted_at: string | null
}

/** Bounded ledger row from GET /inventory/movements. */
export interface StockMovementSummary {
  id: string
  reason: MovementReason
  status: MovementStatus
  direction: MovementDirection
  is_reversal: boolean
  quantity: number
  reference: string | null
  from_location: MovementLocationRef | null
  to_location: MovementLocationRef | null
  variant: MovementVariantRef | null
  actor: MovementActorRef | null
  source: MovementSourceRef | null
  posted_at: string | null
  created_at: string
  updated_at: string
}

/** Full audit evidence from GET /inventory/movements/{id}. */
export interface StockMovement extends StockMovementSummary {
  notes: string | null
  reverses: MovementLinkRef | null
  reversed_by: MovementLinkRef | null
  reversed_at: string | null
  reversal_reason: string | null
}

export interface StockMovementListParams {
  page?: number
  per_page?: number
  location_id?: string
  item_variant_id?: string
  reason?: MovementReason
  status?: MovementStatus
  date_from?: string
  date_to?: string
  search?: string
  source_type?: MovementSourceType
}
