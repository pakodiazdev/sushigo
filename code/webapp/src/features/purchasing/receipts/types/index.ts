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
  destination_location: ReceiptLocationRef | null
  lines: ReceiptLine[]
  posted_at: string | null
  posted_by: ReceiptUserRef | null
  reversed_at: string | null
  reversed_by: ReceiptUserRef | null
  reversal_reason: string | null
  created_at: string
  updated_at: string
}
