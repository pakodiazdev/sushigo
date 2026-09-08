import type { VariantAssignmentState } from '../types'

export const variantAssignmentQueryKeys = {
  all: ['variant-assignments'] as const,
  forLocation: (locationId: string) =>
    [...variantAssignmentQueryKeys.all, 'location', locationId] as const,
  list: (locationId: string, state: VariantAssignmentState, search: string) =>
    [...variantAssignmentQueryKeys.forLocation(locationId), state, search] as const,
  /**
   * Key for a full-catalog "assigned variants" picker for one location (e.g. the
   * Stock Transfer line selector, which pages through every assigned variant).
   * Nested under `forLocation` so an assign/unassign mutation's
   * `invalidateQueries({ queryKey: forLocation(id) })` reaches it, but with a
   * distinct trailing segment so it never shares a cache entry with the
   * assignments panel's own `list(id, 'assigned', '')` infinite query.
   */
  picker: (locationId: string) =>
    [...variantAssignmentQueryKeys.forLocation(locationId), 'picker'] as const,
}
