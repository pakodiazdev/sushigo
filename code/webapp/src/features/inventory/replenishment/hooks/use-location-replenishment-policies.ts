import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { replenishmentPolicyApi } from '../api/replenishment-api'
import { replenishmentQueryKeys } from '../api/query-keys'
import type { ReplenishmentPolicyPayload } from '../types'

/**
 * Owns the write side of per-location replenishment policies (#439): which row
 * is being edited, and the upsert / clear mutations. Reads come from whatever
 * Stock/Location view embeds the panel (the Stock Dashboard's by-location
 * summary), so this hook only invalidates stock queries on success.
 */
export function useLocationReplenishmentPolicies(locationId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: replenishmentQueryKeys.forLocation(locationId) })
    queryClient.invalidateQueries({ queryKey: ['stock-all'] })
    queryClient.invalidateQueries({ queryKey: ['stock-by-location', locationId] })
  }

  const upsertMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: ReplenishmentPolicyPayload }) =>
      replenishmentPolicyApi.upsert(locationId, variantId, data),
    onSuccess: () => {
      invalidate()
      setEditingVariantId(null)
      showSuccess('Replenishment threshold saved', 'Threshold Saved')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to save the replenishment threshold'), 'Save Error')
    },
  })

  const clearMutation = useMutation({
    mutationFn: (variantId: string) => replenishmentPolicyApi.remove(locationId, variantId),
    onSuccess: () => {
      invalidate()
      setEditingVariantId(null)
      showSuccess('Replenishment threshold removed', 'Threshold Removed')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to remove the replenishment threshold'), 'Remove Error')
    },
  })

  return {
    editingVariantId,
    startEditing: (variantId: string) => setEditingVariantId(variantId),
    cancelEditing: () => setEditingVariantId(null),
    save: (variantId: string, data: ReplenishmentPolicyPayload) =>
      upsertMutation.mutate({ variantId, data }),
    clear: (variantId: string) => clearMutation.mutate(variantId),
    isSaving: upsertMutation.isPending,
    isClearing: clearMutation.isPending,
  }
}
