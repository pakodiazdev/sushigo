// Inventory Location Types
export interface InventoryLocation {
  id: string
  operating_unit_id: number
  name: string
  type: 'MAIN' | 'TEMP' | 'KITCHEN' | 'BAR' | 'RETURN'
  priority: number
  is_primary: boolean
  is_active: boolean
  /** Explicit purchase-receiving capability (#568) — whether supplier purchases
   *  may be received into this Location. Independent from `is_primary`/`is_active`. */
  can_receive_purchases: boolean
  notes?: string
  operating_unit?: {
    id: number
    name: string
    type: string
  }
  created_at?: string
  updated_at?: string
}

// Item Types
export interface Item {
  id: number
  /** Nullable since #422: new Product-type Items (see `/inventory/products`) never populate it. */
  sku: string | null
  name: string
  description?: string
  type: 'INSUMO' | 'PRODUCTO' | 'ACTIVO'
  is_stocked: boolean
  is_perishable: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Request-only fields accepted by POST/PUT /items to attach a media gallery — never present on
 * a GET response, so kept out of `Item` itself (see doc/conventions/backend/media-uploads.md).
 */
export interface ItemMediaAttachment {
  /** Gallery public_id (ULID) to attach */
  media_gallery_id?: string
  /** Required alongside media_gallery_id only while that gallery is still unattached */
  owner_token?: string
}

// Item Variant Types
export interface ItemVariant {
  id: string
  item_id: number
  code: string
  name: string
  uom_id: number
  // Replenishment thresholds moved to the per-Inventory-Location policy (#439);
  // per-Variant acquisition cost / sale price were dropped in #442 (Stock.weighted_avg_cost
  // and effective-dated price lists are the sources of truth). See ReplenishmentPolicy,
  // the Stock fields below, and the pricing feature.
  is_active: boolean
  item?: Item
  uom?: UnitOfMeasure
  created_at?: string
  updated_at?: string
}

// Brand Types (see doc/architecture/product-catalog/product-catalog-architecture.en.md §3.1)
export interface Brand {
  /** ULID public identifier. */
  id: string
  name: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Inventory Category Types — distinct from the unrelated Menu/Dishes `DishCategory`.
export interface InventoryCategory {
  /** ULID public identifier. */
  id: string
  name: string
  position: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** Minimal Brand reference embedded in a Product response. */
export interface ProductBrandRef {
  id: string
  name: string
}

/** Minimal InventoryCategory reference embedded in a Product response. */
export interface ProductCategoryRef {
  id: string
  name: string
}

// Product Types — Item scoped to type=PRODUCTO, catalog-identity-only contract
// from #422 (no cost, price, UOM, stock). See ProductResource on the backend.
export interface Product {
  id: string
  name: string
  description: string | null
  is_active: boolean
  brand: ProductBrandRef | null
  inventory_category: ProductCategoryRef | null
  /** Primary photo URL, or null when no gallery is attached. */
  photo_url: string | null
  variants_count: number
  /** Backend-authored, human-readable notes about this Product's current state
   *  (e.g. an assigned but inactive/deleted category). Empty when nothing to flag. */
  warnings: string[]
  created_at?: string
  updated_at?: string
}

/**
 * Request-only fields accepted by POST /inventory/products to attach a media gallery —
 * never present on a GET response, and create-only (no GET-gallery-assets endpoint yet
 * to hydrate an edit form — mirrors ItemMediaAttachment's own restriction above).
 */
export interface ProductMediaAttachment {
  media_gallery_id?: string
  owner_token?: string
}

/** Minimal UnitOfMeasure reference embedded in a ProductVariant response. */
export interface ProductVariantUomRef {
  id: string
  code: string
  name: string
  symbol: string
}

// Product Variant Types — ItemVariant scoped to a Product-type Item, catalog-identity-only
// contract from #424 (no cost, sale price, or stock thresholds). See VariantResource on the
// backend and doc/architecture/product-catalog/product-catalog-architecture.en.md §6. Distinct
// from the legacy `ItemVariant` type above, which still carries the old commercial fields.
export interface ProductVariant {
  id: string
  item_id: string
  code: string
  barcode: string | null
  name: string
  description: string | null
  uom: ProductVariantUomRef | null
  track_lot: boolean
  track_serial: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Purchase Presentation Template Types — reusable, admin-managed commercial package
// definitions (Unit/Pack/Box/Tray). See PurchasePresentationTemplateResource on the backend and
// doc/architecture/product-catalog/product-catalog-architecture.en.md §3/§6.
export type PurchasePresentationPackageType = 'UNIT' | 'PACK' | 'BOX' | 'TRAY'

/** Minimal UnitOfMeasure reference embedded in a PurchasePresentationTemplate response. */
export interface PurchasePresentationTemplateUomRef {
  id: string
  code: string
  name: string
  symbol: string
}

export interface PurchasePresentationTemplate {
  /** ULID public identifier. */
  id: string
  code: string
  name: string
  package_type: PurchasePresentationPackageType
  /** How many of the Variant's base UOM units one of this package contains. */
  base_unit_quantity: number
  compatible_dimension_uom: PurchasePresentationTemplateUomRef | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** Lean template summary embedded in a VariantPurchasePresentation response — see
 *  VariantPurchasePresentationResource on the backend. Fetch the full template resource
 *  (by id) if compatible_dimension_uom or timestamps are needed. */
export interface VariantPurchasePresentationTemplateRef {
  id: string
  code: string
  name: string
  package_type: PurchasePresentationPackageType
  base_unit_quantity: number
}

// Variant Purchase Presentation Types — the assignment of a reusable template to a specific
// Product Variant. See VariantPurchasePresentationResource on the backend.
export interface VariantPurchasePresentation {
  /** ULID public identifier. */
  id: string
  item_variant_id: number
  template: VariantPurchasePresentationTemplateRef | null
  /** Barcode printed on the package — separate namespace from the Variant's own unit barcode. */
  package_barcode: string | null
  is_default: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Unit of Measure Types
export interface UnitOfMeasure {
  id: string
  code: string
  name: string
  symbol: string
  type: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'UNIT' | 'TIME'
  precision: number
  is_base: boolean
  is_active: boolean
}

// Stock Types
export interface Stock {
  id: number
  inventory_location_id: string
  item_variant_id: string
  on_hand: number
  reserved: number
  available: number
  weighted_avg_cost: number
  /** Resolved per-location replenishment reorder point (#439); null when no policy is configured. */
  min_stock: number | null
  /** Resolved per-location replenishment ceiling (#439); null when no policy is configured. */
  max_stock: number | null
  /** True when a policy exists for this (location, variant) and on_hand <= its reorder point. */
  is_low_stock: boolean
  inventory_location?: InventoryLocation
  item_variant?: ItemVariant
}

/**
 * Per-(Inventory Location, Variant) replenishment policy (#439). `id` is null on the
 * synthetic response the show endpoint returns when nothing is configured yet.
 */
export interface ReplenishmentPolicy {
  id: string | null
  inventory_location_id: string
  item_variant_id: string
  min_stock: number
  max_stock: number
  notes: string | null
  is_configured: boolean
  created_at?: string | null
  updated_at?: string | null
}

// Stock Movement Types — aligned with the normalized backend contract from #438
// (App\Models\StockMovement). The legacy `type` axis was dropped: a movement's
// nature is expressed by `reason` plus the from/to location pair. `status` is
// DRAFT → POSTED, and POSTED history is append-only; a POSTED movement can be
// compensated at most once by a reversal movement that points back at it via
// `reverses_stock_movement_id` and flips the original's status to REVERSED.
export type StockMovementReason =
  | 'TRANSFER'
  | 'RETURN'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'CONSUMPTION'
  | 'OPENING_BALANCE'
  | 'COUNT_VARIANCE'
  | 'PURCHASE_RECEIPT'
  | 'PURCHASE_RECEIPT_REVERSAL'

export type StockMovementStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export interface StockMovement {
  /** ULID public identifier — the numeric primary key is never serialized (SerializesPublicIdAsId). */
  id: number
  from_location_id: number | null
  to_location_id: number | null
  item_variant_id: number | null
  user_id: number | null
  qty: number
  reason: StockMovementReason
  status: StockMovementStatus
  reference: string | null
  /** Polymorphic origin (e.g. the PurchaseReceipt that posted this movement). */
  related_id: number | null
  related_type: string | null
  /** Set only on a compensating reversal: the POSTED movement this row reverses. */
  reverses_stock_movement_id: number | null
  /** Set on the original movement once a reversal compensates it. */
  reversed_by_user_id: number | null
  reversed_at: string | null
  reversal_reason: string | null
  notes: string | null
  meta: Record<string, unknown> | null
  posted_at: string | null
  /** Single-line contract (#438): at most one line, agreeing with the header. */
  lines?: StockMovementLine[]
  from_location?: InventoryLocation
  to_location?: InventoryLocation
  item_variant?: ItemVariant
  created_at?: string
  updated_at?: string
}

export interface StockMovementLine {
  /** ULID public identifier (SerializesPublicIdAsId). */
  id: number
  stock_movement_id: number
  item_variant_id: number
  uom_id: number
  /** Quantity in the transaction UOM. */
  qty: number
  /** Quantity converted to the variant's base UOM — must match the header `qty`. */
  base_qty: number
  conversion_factor: number
  unit_cost: number | null
  line_total: number | null
  sale_price: number | null
  sale_total: number | null
  profit_margin: number | null
  profit_total: number | null
  meta: Record<string, unknown> | null
  item_variant?: ItemVariant
  uom?: UnitOfMeasure
}

// API Response Types
export interface PaginatedResponse<T> {
  status: number
  data: T[]
  meta: {
    current_page: number
    total: number
    per_page?: number
    last_page?: number
  }
}

export interface EntityResponse<T> {
  status: number
  data: T
}

/** Non-paginated collection envelope — used by /brands and /inventory-categories. */
export interface CollectionResponse<T> {
  status: number
  data: T[]
}

export interface ErrorResponse {
  status: number
  message: string
  errors?: Record<string, string[]>
}
