import type { VariantAssignmentState } from '../types'

export const variantAssignmentQueryKeys = {
  all: ['variant-assignments'] as const,
  forLocation: (locationId: string) =>
    [...variantAssignmentQueryKeys.all, 'location', locationId] as const,
  list: (locationId: string, state: VariantAssignmentState, search: string) =>
    [...variantAssignmentQueryKeys.forLocation(locationId), state, search] as const,
}
