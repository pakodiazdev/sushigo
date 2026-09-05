/** The three projections the list endpoint (#569) can return. */
export type VariantAssignmentState = 'assigned' | 'unassigned' | 'all'

/**
 * One Variant's managed-assortment state at a given Inventory Location (#569).
 * Returned by `GET /inventory-locations/{id}/variant-assignments` regardless of
 * whether the Variant is currently assigned, so a picker can render assigned
 * and assignable Variants from one paginated response.
 */
export interface VariantAssignmentRow {
  assignment_id: string | null
  assigned: boolean
  inventory_location_id: string
  item_variant_id: string
  item_variant_code: string
  item_variant_name: string
  assigned_at: string | null
}
