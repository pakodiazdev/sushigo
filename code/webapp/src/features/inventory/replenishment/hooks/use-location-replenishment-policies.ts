import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { useCanAccess } from '@/hooks/use-can-access'
import { getApiErrorMessage } from '@/lib/api-error'
import { replenishmentPolicyApi } from '../api/replenishment-api'
import { replenishmentQueryKeys } from '../api/query-keys'
import type { ReplenishmentPolicy, ReplenishmentPolicyPayload } from '../types'

/**
 * Owns the write side of per-location replenishment policies (#439): whether the
 * viewer may write at all, which row is being edited, the resolved policy for
 * that row (so an edit seeds every field, `notes` included, instead of blanking
 * it), and the upsert / clear mutations. The list of rows comes from whatever
 * Stock/Location view embeds the panel (the Stock Dashboard's by-location
 * summary), so this hook only invalidates stock queries on success.
 */
export function useLocationReplenishmentPolicies(locationId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const canManage = useCanAccess({ permission: 'stock.manage' })
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)

  // The by-location summary carries the resolved min/max but not `notes`; fetch
  // the full policy for the row being edited so Save never erases an existing
  // note (Codex review on PR #526).
  const editingPolicyQuery = useQuery({
    queryKey: [...replenishmentQueryKeys.forLocation(locationId), 'resolved', editingVariantId],
    queryFn: () => replenishmentPolicyApi.getResolved(locationId, editingVariantId as string),
    enabled: canManage && editingVariantId !== null,
  })
  const editingPolicy: ReplenishmentPolicy | undefined = editingPolicyQuery.data?.data.data

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
    canManage,
    editingVariantId,
    editingPolicy,
    isEditingPolicyLoading: editingPolicyQuery.isLoading,
    startEditing: (variantId: string) => canManage && setEditingVariantId(variantId),
    cancelEditing: () => setEditingVariantId(null),
    save: (variantId: string, data: ReplenishmentPolicyPayload) =>
      upsertMutation.mutate({ variantId, data }),
    clear: (variantId: string) => clearMutation.mutate(variantId),
    isSaving: upsertMutation.isPending,
    isClearing: clearMutation.isPending,
  }
}
