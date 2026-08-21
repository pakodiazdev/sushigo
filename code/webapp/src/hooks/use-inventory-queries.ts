import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
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
    queryFn: () => inventoryLocationApi.list({ is_active: true, per_page: 100 }),
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
 */
export function useItemsSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.itemsList({ is_active: true, for_select: true }),
    queryFn: () => itemApi.list({ is_active: true, per_page: 100 }),
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
    queryFn: () => itemVariantApi.list({ is_active: true, per_page: 200 }),
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
 * Hook to fetch operating units for use in select dropdowns.
 */
export function useOperatingUnitsSelect(enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.operatingUnits(),
    queryFn: async () => {
      const response = await apiClient.get('/operating-units')
      return response
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
