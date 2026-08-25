import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { pricingResolveApi } from '../api/pricing-api'
import type { PriceResolutionResult } from '../types'

/**
 * Drives the "resolved-price preview" widget (Acceptance Criterion: "Resolved-price preview
 * matches the backend") — a Variant + Branch (+ optional Operating Unit) + as-of date, resolved
 * via GET /pricing/resolve on demand (button-triggered, not live-typing, since every keystroke
 * would otherwise fire a request). `resolved: false` is rendered as a normal result, never as
 * an error — see doc/architecture/pricing/pricing-architecture.en.md §3.
 */
export function useResolvedPricePreview() {
  const { showError } = useToast()

  const [itemVariantId, setItemVariantId] = useState('')
  const [branchId, setBranchId] = useState<number | null>(null)
  const [operatingUnitId, setOperatingUnitId] = useState<number | null>(null)
  const [asOf, setAsOf] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      pricingResolveApi.resolve({
        item_variant_id: itemVariantId,
        branch_id: branchId!,
        operating_unit_id: operatingUnitId,
        as_of: asOf || undefined,
      }),
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to preview the resolved price'))
    },
  })

  const changeCriterion = <T,>(setter: (value: T) => void) => (value: T) => {
    mutation.reset()
    setter(value)
  }

  const setItemVariantIdAndReset = changeCriterion(setItemVariantId)
  const setBranchIdAndReset = changeCriterion(setBranchId)
  const setOperatingUnitIdAndReset = changeCriterion(setOperatingUnitId)
  const setAsOfAndReset = changeCriterion(setAsOf)

  const canPreview = !!itemVariantId && !!branchId

  const handlePreview = () => {
    if (!canPreview || mutation.isPending) return
    mutation.mutate()
  }

  const result: PriceResolutionResult | null = mutation.data?.data.data ?? null

  return {
    itemVariantId,
    setItemVariantId: setItemVariantIdAndReset,
    branchId,
    setBranchId: setBranchIdAndReset,
    operatingUnitId,
    setOperatingUnitId: setOperatingUnitIdAndReset,
    asOf,
    setAsOf: setAsOfAndReset,
    canPreview,
    handlePreview,
    isPending: mutation.isPending,
    result,
  }
}
