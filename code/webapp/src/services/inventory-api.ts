import { apiClient } from '@/lib/api-client'
import type {
  Brand,
  CollectionResponse,
  InventoryCategory,
  InventoryLocation,
  Item,
  ItemMediaAttachment,
  ItemVariant,
  Product,
  ProductMediaAttachment,
  ProductVariant,
  PurchasePresentationPackageType,
  PurchasePresentationTemplate,
  Stock,
  StockMovement,
  VariantPurchasePresentation,
  PaginatedResponse,
  EntityResponse,
} from '@/types/inventory'

// Use centralized API client instead of creating a new instance
const api = apiClient

// Inventory Locations
export const inventoryLocationApi = {
  list: (params?: { type?: string; is_active?: boolean; can_receive_purchases?: boolean; per_page?: number; page?: number; search?: string }) =>
    api.get<PaginatedResponse<InventoryLocation>>('/inventory-locations', { params }),

  get: (id: string | number) =>
    api.get<EntityResponse<InventoryLocation>>(`/inventory-locations/${id}`),

  create: (data: Partial<InventoryLocation>) =>
    api.post<EntityResponse<InventoryLocation>>('/inventory-locations', data),

  update: (id: string | number, data: Partial<InventoryLocation>) =>
    api.put<EntityResponse<InventoryLocation>>(`/inventory-locations/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/inventory-locations/${id}`),
}

// Items
export const itemApi = {
  list: (params?: { type?: string; is_active?: boolean; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<Item>>('/items', { params }),

  get: (id: string | number) =>
    api.get<EntityResponse<Item>>(`/items/${id}`),

  // Contextual SKU suggestion for the quick-create form (#500). `name` drives the
  // prefix (`Salmón fresco` → `SAL-001`); omitted/blank yields the `ITEM-` fallback.
  nextSku: (params?: { name?: string; type?: string }) =>
    api.get<{ sku: string; prefix: string }>('/items/next-sku', { params }),

  create: (data: Partial<Item> & Partial<ItemMediaAttachment>) =>
    api.post<EntityResponse<Item>>('/items', data),

  update: (id: string | number, data: Partial<Item> & Partial<ItemMediaAttachment>) =>
    api.put<EntityResponse<Item>>(`/items/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/items/${id}`),
}

// Item Variants
export const itemVariantApi = {
  list: (params?: { item_id?: number; item_type?: string; is_active?: boolean; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<ItemVariant>>('/item-variants', { params }),

  get: (id: string | number) =>
    api.get<EntityResponse<ItemVariant>>(`/item-variants/${id}`),

  suggestCode: (params: { item_id: string; name: string; uom_id: string }) =>
    api.get<{ code: string; prefix: string }>('/item-variants/suggest-code', { params }),

  create: (data: Partial<Omit<ItemVariant, 'item_id' | 'uom_id'>> & { item_id?: string | number; uom_id?: string | number }) =>
    api.post<EntityResponse<ItemVariant>>('/item-variants', data),

  update: (id: string | number, data: Partial<Omit<ItemVariant, 'item_id' | 'uom_id'>> & { item_id?: string | number; uom_id?: string | number }) =>
    api.put<EntityResponse<ItemVariant>>(`/item-variants/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/item-variants/${id}`),
}

// Products — Item scoped to type=PRODUCTO, catalog-identity-only contract (#422).
// See doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
export const productApi = {
  list: (params?: {
    search?: string
    brand_id?: string
    inventory_category_id?: string
    is_active?: boolean
    per_page?: number
    page?: number
  }) => api.get<PaginatedResponse<Product>>('/inventory/products', { params }),

  get: (id: string | number) =>
    api.get<EntityResponse<Product>>(`/inventory/products/${id}`),

  create: (data: Partial<Product> & Partial<ProductMediaAttachment> & { inventory_category_id?: string; brand_id?: string | null }) =>
    api.post<EntityResponse<Product>>('/inventory/products', data),

  update: (id: string | number, data: Partial<Product> & Partial<ProductMediaAttachment> & { inventory_category_id?: string; brand_id?: string | null }) =>
    api.put<EntityResponse<Product>>(`/inventory/products/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/inventory/products/${id}`),
}

// Product Variants — ItemVariant scoped to a Product-type Item, catalog-identity-only
// contract (#424). See doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
// Distinct from the legacy, unscoped itemVariantApi above — item_id always comes from the
// route (productId), never from the request body.
export interface ProductVariantPayload {
  name: string
  code: string
  barcode?: string | null
  uom_id: string
  description?: string | null
  track_lot?: boolean
  track_serial?: boolean
  is_active?: boolean
}

export const productVariantApi = {
  list: (productId: string | number, params?: { per_page?: number; page?: number; search?: string; is_active?: boolean }) =>
    api.get<PaginatedResponse<ProductVariant>>(`/inventory/products/${productId}/variants`, { params }),

  get: (productId: string | number, variantId: string | number) =>
    api.get<EntityResponse<ProductVariant>>(`/inventory/products/${productId}/variants/${variantId}`),

  suggestCode: (productId: string | number, params: { name: string; uom_id: string }) =>
    api.get<{ code: string; prefix: string }>(`/inventory/products/${productId}/variants/suggest-code`, { params }),

  create: (productId: string | number, data: ProductVariantPayload) =>
    api.post<EntityResponse<ProductVariant>>(`/inventory/products/${productId}/variants`, data),

  update: (productId: string | number, variantId: string | number, data: Partial<ProductVariantPayload>) =>
    api.put<EntityResponse<ProductVariant>>(`/inventory/products/${productId}/variants/${variantId}`, data),
}

// Purchase Presentation Templates — global, reusable commercial package definitions
// (Unit/Pack/Box/Tray), not Product/Variant-scoped (#426/#427). See
// doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
export interface PurchasePresentationTemplatePayload {
  code: string
  name: string
  package_type: PurchasePresentationPackageType
  base_unit_quantity: number
  compatible_dimension_uom_id: string
  is_active?: boolean
}

export interface PurchasePresentationTemplateCodeContext {
  package_type: PurchasePresentationPackageType
  base_unit_quantity: number
  compatible_dimension_uom_id: string
}

export const purchasePresentationTemplateApi = {
  list: (params?: { is_active?: boolean; package_type?: PurchasePresentationPackageType }) =>
    api.get<CollectionResponse<PurchasePresentationTemplate>>('/inventory/purchase-presentation-templates', { params }),

  get: (templateId: string) =>
    api.get<EntityResponse<PurchasePresentationTemplate>>(`/inventory/purchase-presentation-templates/${templateId}`),

  suggestCode: (params: PurchasePresentationTemplateCodeContext) =>
    api.get<{ code: string }>('/inventory/purchase-presentation-templates/suggest-code', { params }),

  create: (data: PurchasePresentationTemplatePayload) =>
    api.post<EntityResponse<PurchasePresentationTemplate>>('/inventory/purchase-presentation-templates', data),

  update: (templateId: string, data: Partial<PurchasePresentationTemplatePayload>) =>
    api.put<EntityResponse<PurchasePresentationTemplate>>(`/inventory/purchase-presentation-templates/${templateId}`, data),

  delete: (templateId: string) =>
    api.delete(`/inventory/purchase-presentation-templates/${templateId}`),
}

// Variant Purchase Presentations — assignment of a reusable template to a specific Product
// Variant (#426/#427). Distinct from the global template catalog above — item_id/variant_id
// always come from the route, never from the request body.
export interface VariantPurchasePresentationPayload {
  template_id: string
  package_barcode?: string | null
  is_default?: boolean
}

export interface VariantPurchasePresentationUpdatePayload {
  package_barcode?: string | null
  is_default?: boolean
  is_active?: boolean
}

export const variantPurchasePresentationApi = {
  list: (productId: string, variantId: string) =>
    api.get<CollectionResponse<VariantPurchasePresentation>>(
      `/inventory/products/${productId}/variants/${variantId}/purchase-presentations`
    ),

  create: (productId: string, variantId: string, data: VariantPurchasePresentationPayload) =>
    api.post<EntityResponse<VariantPurchasePresentation>>(
      `/inventory/products/${productId}/variants/${variantId}/purchase-presentations`,
      data
    ),

  update: (
    productId: string,
    variantId: string,
    presentationId: string,
    data: VariantPurchasePresentationUpdatePayload
  ) =>
    api.put<EntityResponse<VariantPurchasePresentation>>(
      `/inventory/products/${productId}/variants/${variantId}/purchase-presentations/${presentationId}`,
      data
    ),
}

// Brands — see doc/architecture/product-catalog/product-catalog-architecture.en.md §3.1.
export const brandApi = {
  list: (params?: { is_active?: boolean }) =>
    api.get<CollectionResponse<Brand>>('/brands', { params }),
}

// Inventory Categories — distinct from the unrelated Menu/Dishes DishCategory.
export const inventoryCategoryApi = {
  list: (params?: { is_active?: boolean }) =>
    api.get<CollectionResponse<InventoryCategory>>('/inventory-categories', { params }),
}

// Stock
export const stockApi = {
  list: (params?: { location_id?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Stock>>('/stock', { params }),

  byLocation: (locationId: string | number) =>
    api.get<EntityResponse<{
      inventory_location: InventoryLocation
      summary: {
        total_variants: number
        total_on_hand: number
        total_reserved: number
        total_available: number
        low_stock_variants: number
        total_inventory_value: number
      }
      items: Array<{
        item_variant_id: string
        item_variant_code: string
        item_variant_name: string
        item_name: string
        item_sku: string
        on_hand: number
        reserved: number
        available: number
        weighted_avg_cost: number
        total_value: number
        /** Resolved per-location replenishment reorder point (#439); null when unset. */
        min_stock: number | null
        /** Resolved per-location replenishment ceiling (#439); null when unset. */
        max_stock: number | null
        is_low_stock: boolean
      }>
    }>>(`/stock/by-location/${locationId}`),

  byVariant: (variantId: string | number) =>
    api.get(`/stock/by-variant/${variantId}`),
}

// Stock Movements
export const stockMovementApi = {
  openingBalance: (data: {
    inventory_location_id: string
    item_variant_id: string
    quantity: number
    uom_id: string
    unit_cost?: number
    notes?: string
  }) =>
    api.post<EntityResponse<StockMovement>>('/inventory/opening-balance', data),

  stockOut: (data: {
    inventory_location_id: string
    item_variant_id: string
    qty: number
    uom_id: string
    reason: 'SALE' | 'CONSUMPTION'
    sale_price?: number
    notes?: string
  }) =>
    api.post<EntityResponse<StockMovement>>('/inventory/stock-out', data),
}

export default api
