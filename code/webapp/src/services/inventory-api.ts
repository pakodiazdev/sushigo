import { apiClient } from '@/lib/api-client'
import type {
  InventoryLocation,
  Item,
  ItemVariant,
  Stock,
  StockMovement,
  PaginatedResponse,
  EntityResponse,
} from '@/types/inventory'

// Use centralized API client instead of creating a new instance
const api = apiClient

// Inventory Locations
export const inventoryLocationApi = {
  list: (params?: { type?: string; is_active?: boolean; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<InventoryLocation>>('/inventory-locations', { params }),

  get: (id: number) =>
    api.get<EntityResponse<InventoryLocation>>(`/inventory-locations/${id}`),

  create: (data: Partial<InventoryLocation>) =>
    api.post<EntityResponse<InventoryLocation>>('/inventory-locations', data),

  update: (id: number, data: Partial<InventoryLocation>) =>
    api.put<EntityResponse<InventoryLocation>>(`/inventory-locations/${id}`, data),

  delete: (id: number) =>
    api.delete(`/inventory-locations/${id}`),
}

// Items
export const itemApi = {
  list: (params?: { type?: string; is_active?: boolean; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<Item>>('/items', { params }),

  get: (id: number) =>
    api.get<EntityResponse<Item>>(`/items/${id}`),

  create: (data: Partial<Item>) =>
    api.post<EntityResponse<Item>>('/items', data),

  update: (id: number, data: Partial<Item>) =>
    api.put<EntityResponse<Item>>(`/items/${id}`, data),

  delete: (id: number) =>
    api.delete(`/items/${id}`),
}

// Item Variants
export const itemVariantApi = {
  list: (params?: { item_id?: number; is_active?: boolean; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<ItemVariant>>('/item-variants', { params }),

  get: (id: number) =>
    api.get<EntityResponse<ItemVariant>>(`/item-variants/${id}`),

  create: (data: Partial<ItemVariant>) =>
    api.post<EntityResponse<ItemVariant>>('/item-variants', data),

  update: (id: number, data: Partial<ItemVariant>) =>
    api.put<EntityResponse<ItemVariant>>(`/item-variants/${id}`, data),

  delete: (id: number) =>
    api.delete(`/item-variants/${id}`),
}

// Stock
export const stockApi = {
  list: (params?: { location_id?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Stock>>('/stock', { params }),

  byLocation: (locationId: number) =>
    api.get<EntityResponse<{
      inventory_location: InventoryLocation
      summary: {
        total_variants: number
        total_on_hand: number
        total_reserved: number
        total_available: number
        total_inventory_value: number
      }
      items: Array<{
        item_variant_id: number
        item_variant_code: string
        item_variant_name: string
        item_name: string
        item_sku: string
        on_hand: number
        reserved: number
        available: number
        weighted_avg_cost: number
        total_value: number
      }>
    }>>(`/stock/by-location/${locationId}`),

  byVariant: (variantId: number) =>
    api.get(`/stock/by-variant/${variantId}`),
}

// Stock Movements
export const stockMovementApi = {
  openingBalance: (data: {
    inventory_location_id: number
    item_variant_id: number
    quantity: number
    uom_id: number
    unit_cost?: number
    notes?: string
  }) =>
    api.post<EntityResponse<StockMovement>>('/inventory/opening-balance', data),

  stockOut: (data: {
    location_id: number
    variant_id: number
    qty: number
    uom_id: number
    reason: 'SALE' | 'CONSUMPTION'
    sale_price?: number
    notes?: string
  }) =>
    api.post<EntityResponse<StockMovement>>('/inventory/stock-out', data),
}

export default api
