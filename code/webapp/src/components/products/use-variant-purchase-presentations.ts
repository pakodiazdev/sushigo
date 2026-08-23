import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { variantPurchasePresentationApi } from '@/services/inventory-api'
import type { VariantPurchasePresentation } from '@/types/inventory'

/**
 * Nested state for Purchase Presentations, one level deeper than the embedded Variant
 * detail screen (see use-product-variants.ts's own docblock and
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.2's
 * PresentationList/PresentationAssign states) — this extends the same top-level SlidePanel
 * instance rather than opening a new one. 'list' is VariantDetails' own "Purchase
 * presentations" section; 'assign' is the "+ Assign template" form (new assignment);
 * 'edit' is an existing assignment's edit/deactivate/reactivate form (template read-only).
 * There is no separate 'detail' read state — the list already shows every field, so a row
 * click opens directly into 'edit'.
 */
export type PresentationPanelMode = 'list' | 'assign' | 'edit'

export function useVariantPurchasePresentations(
  productId: string | null,
  variantId: string | null,
  isReachable: boolean
) {
  const queryClient = useQueryClient()
  const { showError } = useToast()

  const [presentationMode, setPresentationMode] = useState<PresentationPanelMode>('list')
  const [selectedPresentation, setSelectedPresentation] = useState<VariantPurchasePresentation | null>(null)

  // Reset to the list view whenever the Variant being viewed changes (including to/from
  // null, e.g. the outer panel closing/reopening or the user backing out to the Variant
  // list and picking a different card) — a leftover assign/edit form from a *previous*
  // Variant must never surface against a newly-selected one. useLayoutEffect for the same
  // reason use-product-variants.ts uses it: SlidePanel keeps content mounted through its
  // exit animation, so a passive effect would let a stale screen flash for one frame.
  const prevVariantIdRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (variantId !== prevVariantIdRef.current) {
      setPresentationMode('list')
      setSelectedPresentation(null)
    }
    prevVariantIdRef.current = variantId
  }, [variantId])

  const presentationsQuery = useQuery({
    queryKey: ['products', productId, 'variants', variantId, 'purchase-presentations'],
    queryFn: () => variantPurchasePresentationApi.list(productId!, variantId!),
    // Mirrors use-product-variants.ts's own gate: must stay disabled while the Presentation
    // section isn't reachable, not just when the ids happen to be set.
    enabled: productId != null && variantId != null && isReachable,
  })
  const presentations = presentationsQuery.data?.data.data ?? []

  useEffect(() => {
    if (presentationsQuery.isError) {
      showError(getApiErrorMessage(presentationsQuery.error, 'Failed to load purchase presentations'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationsQuery.isError])

  const invalidatePresentations = () => {
    queryClient.invalidateQueries({
      queryKey: ['products', productId, 'variants', variantId, 'purchase-presentations'],
    })
  }

  const handleAssignPresentation = () => {
    setSelectedPresentation(null)
    setPresentationMode('assign')
  }

  const handlePresentationClick = (presentation: VariantPurchasePresentation) => {
    setSelectedPresentation(presentation)
    setPresentationMode('edit')
  }

  const handleBackToList = () => {
    setSelectedPresentation(null)
    setPresentationMode('list')
  }

  const handlePresentationSaved = () => {
    invalidatePresentations()
    setSelectedPresentation(null)
    setPresentationMode('list')
  }

  return {
    presentations,
    isLoading: presentationsQuery.isLoading,
    isError: presentationsQuery.isError,
    presentationMode,
    selectedPresentation,
    handleAssignPresentation,
    handlePresentationClick,
    handleBackToList,
    handlePresentationSaved,
  }
}
