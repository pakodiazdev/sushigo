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
  sku: string
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

export interface ErrorResponse {
  status: number
  message: string
  errors?: Record<string, string[]>
}
