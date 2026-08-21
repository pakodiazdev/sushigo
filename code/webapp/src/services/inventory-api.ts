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

  create: (data: Partial<Item> & Partial<ItemMediaAttachment>) =>
    api.post<EntityResponse<Item>>('/items', data),

  update: (id: number, data: Partial<Item> & Partial<ItemMediaAttachment>) =>
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

  get: (id: number) =>
    api.get<EntityResponse<Product>>(`/inventory/products/${id}`),

  create: (data: Partial<Product> & Partial<ProductMediaAttachment> & { inventory_category_id?: string; brand_id?: string | null }) =>
    api.post<EntityResponse<Product>>('/inventory/products', data),

  update: (id: number, data: Partial<Product> & Partial<ProductMediaAttachment> & { inventory_category_id?: string; brand_id?: string | null }) =>
    api.put<EntityResponse<Product>>(`/inventory/products/${id}`, data),

  delete: (id: number) =>
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
  uom_id: number
  description?: string | null
  track_lot?: boolean
  track_serial?: boolean
  is_active?: boolean
}

export const productVariantApi = {
  list: (productId: number, params?: { per_page?: number; page?: number }) =>
    api.get<PaginatedResponse<ProductVariant>>(`/inventory/products/${productId}/variants`, { params }),

  get: (productId: number, variantId: number) =>
    api.get<EntityResponse<ProductVariant>>(`/inventory/products/${productId}/variants/${variantId}`),

  create: (productId: number, data: ProductVariantPayload) =>
    api.post<EntityResponse<ProductVariant>>(`/inventory/products/${productId}/variants`, data),

  update: (productId: number, variantId: number, data: Partial<ProductVariantPayload>) =>
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
  compatible_dimension_uom_id: number
  is_active?: boolean
}

export const purchasePresentationTemplateApi = {
  list: (params?: { is_active?: boolean; package_type?: PurchasePresentationPackageType }) =>
    api.get<CollectionResponse<PurchasePresentationTemplate>>('/inventory/purchase-presentation-templates', { params }),

  get: (templateId: string) =>
    api.get<EntityResponse<PurchasePresentationTemplate>>(`/inventory/purchase-presentation-templates/${templateId}`),

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
  list: (productId: number, variantId: number) =>
    api.get<CollectionResponse<VariantPurchasePresentation>>(
      `/inventory/products/${productId}/variants/${variantId}/purchase-presentations`
    ),

  create: (productId: number, variantId: number, data: VariantPurchasePresentationPayload) =>
    api.post<EntityResponse<VariantPurchasePresentation>>(
      `/inventory/products/${productId}/variants/${variantId}/purchase-presentations`,
      data
    ),

  update: (
    productId: number,
    variantId: number,
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
