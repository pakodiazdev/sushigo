// Inventory Location Types
export interface InventoryLocation {
  id: number
  operating_unit_id: number
  name: string
  type: 'MAIN' | 'TEMP' | 'KITCHEN' | 'BAR' | 'RETURN'
  priority: number
  is_primary: boolean
  is_active: boolean
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
  is_manufactured: boolean
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
  id: number
  item_id: number
  code: string
  name: string
  uom_id: number
  min_stock: number
  max_stock: number
  avg_unit_cost: number
  last_unit_cost: number
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
  id: number
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
  id: number
  code: string
  name: string
  symbol: string
}

// Product Variant Types — ItemVariant scoped to a Product-type Item, catalog-identity-only
// contract from #424 (no cost, sale price, or stock thresholds). See VariantResource on the
// backend and doc/architecture/product-catalog/product-catalog-architecture.en.md §6. Distinct
// from the legacy `ItemVariant` type above, which still carries the old commercial fields.
export interface ProductVariant {
  id: number
  item_id: number
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
  id: number
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
  id: number
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
  inventory_location_id: number
  item_variant_id: number
  on_hand: number
  reserved: number
  available: number
  weighted_avg_cost: number
  inventory_location?: InventoryLocation
  item_variant?: ItemVariant
}

// Stock Movement Types
export interface StockMovement {
  id: number
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  reason: 'OPENING_BALANCE' | 'PURCHASE' | 'SALE' | 'CONSUMPTION' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN'
  from_location_id?: number
  to_location_id?: number
  reference_number?: string
  notes?: string
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'
  lines?: StockMovementLine[]
  from_location?: InventoryLocation
  to_location?: InventoryLocation
  created_at?: string
  updated_at?: string
}

export interface StockMovementLine {
  id: number
  stock_movement_id: number
  item_variant_id: number
  quantity: number
  uom_id: number
  unit_cost?: number
  total_cost?: number
  sale_price?: number
  sale_total?: number
  profit_margin?: number
  profit_total?: number
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
