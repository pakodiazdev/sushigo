// Purchase Receipts (#433), against the Receipt/ReceiptLine backend contract from #432 — see
// code/api/app/Http/Resources/Inventory/Receipt/{ReceiptResource,ReceiptLineResource}.php.
// The backend entity is named "Receipt", not "PurchaseReceipt" — kept consistent here.
export type ReceiptStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export interface ReceiptPartyRef {
  id: string
  code: string
  name: string
}

export interface ReceiptLocationRef {
  id: string
  name: string
}

/**
 * Richer destination context on the Receipt *detail* resource (#572) — its type,
 * receiving capability, active flag and owning Operating Unit, so the detail view
 * shows where the stock landed and why the Location was eligible without a second
 * lookup. The summary list row still carries only `ReceiptLocationRef`.
 *
 * The extra fields are optional in the type (the detail endpoint always populates
 * them; keeping them optional lets `ReceiptLocationRef` fixtures stand in and
 * tolerates any older cached payload) — consumers null-check before use.
 */
export interface ReceiptDestinationRef extends ReceiptLocationRef {
  type?: string
  is_active?: boolean
  can_receive_purchases?: boolean
  operating_unit?: { id: number; name: string; type: string } | null
}

export interface ReceiptUserRef {
  id: string
  name: string
}

export interface ReceiptVariantRef {
  id: string
  code: string
  name: string
}

export interface ReceiptLine {
  id: number
  variant_purchase_presentation_id: string | null
  variant: ReceiptVariantRef | null
  supplier_offering_id: string | null
  ordered_packages: number
  received_packages: number
  bonus_packages: number
  presentation_factor: number
  gross_amount: number
  discounts: number
  allocated_expenses: number
  non_recoverable_taxes: number
  net_acquisition_amount: number
  base_units_received: number
  effective_unit_cost: number
}

export interface Receipt {
  id: string
  status: ReceiptStatus
  reference: string | null
  receipt_date: string
  notes: string | null
  supplier: ReceiptPartyRef | null
  destination_location: ReceiptDestinationRef | null
  lines: ReceiptLine[]
  posted_at: string | null
  posted_by: ReceiptUserRef | null
  reversed_at: string | null
  reversed_by: ReceiptUserRef | null
  reversal_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * Bounded history row from GET /inventory/receipts (#586). The list is a
 * summary read model — it carries an aggregate `total` (sum of line
 * net_acquisition_amount) instead of the `lines` array and the per-user
 * posted_by / reversed_by refs. Full evidence is fetched from the detail
 * endpoint (receiptApi.get) when a row is opened.
 */
export interface ReceiptSummary {
  id: string
  status: ReceiptStatus
  reference: string | null
  receipt_date: string
  notes: string | null
  total: number
  supplier: ReceiptPartyRef | null
  destination_location: ReceiptLocationRef | null
  posted_at: string | null
  reversed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReceiptListParams {
  page?: number
  per_page?: number
  status?: ReceiptStatus
  supplier_id?: string
  destination_location_id?: string
  date_from?: string
  date_to?: string
  search?: string
}
