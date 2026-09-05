import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { inventoryLocationApi, itemVariantApi, itemApi, purchasePresentationTemplateApi } from '@/services/inventory-api'
import type { InventoryLocation, PurchasePresentationTemplate, UnitOfMeasure } from '@/types/inventory'
import type { OperatingUnit } from '@/types/auth'

/**
 * Query key factory for inventory-related queries.
 * Ensures consistent cache keys across the application.
 */
export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  locations: () => [...inventoryQueryKeys.all, 'locations'] as const,
  locationsList: (params?: Record<string, unknown>) => [...inventoryQueryKeys.locations(), 'list', params] as const,
  items: () => [...inventoryQueryKeys.all, 'items'] as const,
  itemsList: (params?: Record<string, unknown>) => [...inventoryQueryKeys.items(), 'list', params] as const,
  variants: () => [...inventoryQueryKeys.all, 'variants'] as const,
  variantsList: (params?: Record<string, unknown>) => [...inventoryQueryKeys.variants(), 'list', params] as const,
  unitsOfMeasure: () => [...inventoryQueryKeys.all, 'units-of-measure'] as const,
  operatingUnits: () => ['operating-units'] as const,
  purchasePresentationTemplates: () => [...inventoryQueryKeys.all, 'purchase-presentation-templates'] as const,
}

export interface SelectOption {
  value: number | string
  label: string
}

/**
 * Hook to fetch inventory locations for use in select dropdowns.
 * Sorted by priority (descending) then by name.
 */
export function useInventoryLocationsSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.locationsList({ is_active: true, for_select: true }),
    // /inventory-locations paginates — fetch every page up front so a location ordered past the
    // first 100 is still selectable (same fix already applied to the receipt line's product and
    // variant selects).
    queryFn: () => fetchAllPages((page) => inventoryLocationApi.list({ is_active: true, page, per_page: 100 })),
    enabled,
    select: (response) => {
      const locations = response.data.data || []
      // Sort by priority (descending) and name
      const sorted = [...locations].sort((a: InventoryLocation, b: InventoryLocation) => {
        const priorityA = a.priority ?? 0
        const priorityB = b.priority ?? 0
        if (priorityB !== priorityA) return priorityB - priorityA
        return (a.name || '').localeCompare(b.name || '')
      })
      return sorted
    },
  })
}

/**
 * Hook to fetch items for use in select dropdowns.
 *
 * Only feeds the legacy global Variant page (`/inventario/variantes`) — excludes PRODUCTO-type
 * items since Product variants must be created via `/inventory/products/{id}/variants` instead
 * (#425), never through this page (#429).
 */
export function useItemsSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.itemsList({ is_active: true, for_select: true }),
    queryFn: () => itemApi.list({ is_active: true, type: 'INSUMO,ACTIVO', per_page: 100 }),
    enabled,
    select: (response) => response.data.data || [],
  })
}

/**
 * Hook to fetch item variants for use in select dropdowns.
 */
export function useItemVariantsSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.variantsList({ is_active: true, for_select: true }),
    // /item-variants paginates — fetch every page up front so a variant ordered past the first
    // page is still selectable (same fix already applied to Locations and the receipt line's
    // product/variant selects).
    queryFn: () => fetchAllPages((page) => itemVariantApi.list({ is_active: true, page, per_page: 100 })),
    enabled,
    select: (response) => response.data.data || [],
  })
}

/**
 * Hook to fetch units of measure for use in select dropdowns.
 */
export function useUnitsOfMeasureSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.unitsOfMeasure(),
    queryFn: async () => {
      const response = await apiClient.get('/units-of-measure', {
        params: { is_active: true, per_page: 100 }
      })
      return response
    },
    enabled,
    select: (response) => (response.data.data || []) as UnitOfMeasure[],
  })
}

/**
 * Hook to fetch operating units for use in select dropdowns. Deliberately unfiltered by
 * `is_active` — this hook is shared by LocationForm (which must keep showing a Location's
 * already-assigned Operating Unit even if it's since gone inactive, or the edit form silently
 * loses the selection) and by the Pricing Assignment name-lookup, which needs to resolve names
 * for existing Assignments that may reference an Operating Unit no longer active.
 */
export function useOperatingUnitsSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.operatingUnits(),
    queryFn: async () => {
      const first = await apiClient.get('/operating-units', {
        params: { per_page: 100, page: 1 },
      })
      // ListOperatingUnitsController returns Laravel's paginator directly
      // (response()->json($operatingUnits)), so last_page sits at the response root, not under
      // a `meta` wrapper like the envelope-formatted endpoints.
      const lastPage = first.data.last_page ?? 1
      if (lastPage <= 1) return first

      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          apiClient.get('/operating-units', {
            params: { per_page: 100, page: index + 2 },
          })
        )
      )

      return {
        ...first,
        data: {
          ...first.data,
          data: [first.data.data, ...rest.map((response) => response.data.data)].flat(),
        },
      }
    },
    enabled,
    select: (response) => (response.data.data || []) as OperatingUnit[],
  })
}

/**
 * Hook to fetch active Purchase Presentation Templates for use in the "Assign template" select
 * (#427). Only active templates can be assigned to new Variant associations — see
 * StoreVariantPurchasePresentationRequest on the backend.
 */
export function usePurchasePresentationTemplatesSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.purchasePresentationTemplates(),
    queryFn: () => purchasePresentationTemplateApi.list({ is_active: true }),
    enabled,
    select: (response) => (response.data.data || []) as PurchasePresentationTemplate[],
  })
}

/**
 * Helper to convert entities to select options
 */
export function toSelectOptions<T extends { id: number; name: string }>(
  items: T[],
  labelFn?: (item: T) => string
): SelectOption[] {
  return items.map(item => ({
    value: item.id,
    label: labelFn ? labelFn(item) : item.name,
  }))
}

/**
 * Helper to find an entity by ID
 */
export function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id)
}
