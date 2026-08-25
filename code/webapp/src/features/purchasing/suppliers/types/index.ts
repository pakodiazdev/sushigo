import type { VariantPurchasePresentationTemplateRef } from '@/types/inventory'

// Supplier catalog and reference quotations (#431). A quotation is commercial
// reference data only; receipt posting owns the authoritative acquisition cost.
export interface Supplier {
  id: string
  code: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  offerings_count: number
  created_at?: string
  updated_at?: string
}

export interface SupplierOfferingPresentation {
  id: string
  package_barcode: string | null
  template: VariantPurchasePresentationTemplateRef | null
  variant: {
    id: string
    code: string
    name: string
    product: { id: string; name: string } | null
  } | null
}

export interface SupplierOffering {
  id: string
  supplier: { id: string; code: string; name: string }
  presentation: SupplierOfferingPresentation
  supplier_code: string | null
  quoted_price: number
  currency: string
  valid_from: string | null
  valid_until: string | null
  minimum_order_quantity: number
  lead_time_days: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}
