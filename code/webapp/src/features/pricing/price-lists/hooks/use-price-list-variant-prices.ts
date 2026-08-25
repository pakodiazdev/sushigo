import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { useCanAccess } from '@/hooks/use-can-access'
import { getApiErrorMessage } from '@/lib/api-error'
import { itemVariantApi } from '@/services/inventory-api'
import { variantPriceApi } from '../api/pricing-api'
import { priceListQueryKeys } from '../api/query-keys'
import type { ItemVariant } from '@/types/inventory'
import type { VariantPrice } from '../types'

/**
 * Nested state for the embedded Variant Prices list inside a Price List's detail SlidePanel —
 * sibling to use-price-list-assignments.ts's AssignmentPanelMode (both are direct children of
 * a Price List, not nested under an Assignment — see
 * doc/architecture/pricing/pricing-architecture.en.md §1). Same 'list'/'create'/'edit' shape.
 */
export type VariantPricePanelMode = 'list' | 'create' | 'edit'

export function usePriceListVariantPrices(priceListId: string | null, isPanelOpen: boolean) {
  const queryClient = useQueryClient()
  const { showError } = useToast()
  const canViewItems = useCanAccess({ permission: 'items.view' })

  const [variantPriceMode, setVariantPriceMode] = useState<VariantPricePanelMode>('list')
  const [selectedVariantPrice, setSelectedVariantPrice] = useState<VariantPrice | null>(null)

  const wasPanelOpenRef = useRef(false)
  useLayoutEffect(() => {
    if (isPanelOpen && !wasPanelOpenRef.current) {
      setVariantPriceMode('list')
      setSelectedVariantPrice(null)
    }
    wasPanelOpenRef.current = isPanelOpen
  }, [isPanelOpen])

  const variantPricesQuery = useQuery({
    queryKey: priceListQueryKeys.variantPrices(priceListId),
    queryFn: async () => {
      const first = await variantPriceApi.list(priceListId!, { per_page: 100, page: 1 })
      const lastPage = first.data.meta.last_page ?? 1
      if (lastPage <= 1) return first

      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          variantPriceApi.list(priceListId!, { per_page: 100, page: index + 2 })
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
    enabled: priceListId != null && isPanelOpen,
  })
  // Stable empty-array fallback, memoized on the query data itself — the plain `?? []`
  // pattern used elsewhere in this codebase creates a new array reference every render,
  // which would otherwise make the variantIds useMemo below recompute (and re-trigger the
  // variant-details batch lookup) on every unrelated re-render, not just when the data
  // actually changes.
  const variantPrices = useMemo(() => variantPricesQuery.data?.data.data ?? [], [variantPricesQuery.data])

  useEffect(() => {
    if (variantPricesQuery.isError) {
      showError(getApiErrorMessage(variantPricesQuery.error, 'Failed to load variant prices'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantPricesQuery.isError])

  // VariantPriceResource only returns item_variant_id (a bare public id, never a nested
  // itemVariant object — see VariantPriceResource on the backend), so the list can't show a
  // Variant's name/code on its own. Enrich with one batch lookup per unique id, mirroring how
  // PurchasePresentationForm looks up its own selectedTemplate from a separately-fetched list.
  const variantIds = useMemo(
    () => Array.from(new Set(variantPrices.map((vp) => vp.item_variant_id))),
    [variantPrices]
  )

  const variantDetailsQuery = useQuery({
    queryKey: priceListQueryKeys.variantDetails(priceListId, variantIds),
    queryFn: async () => {
      const results = await Promise.all(variantIds.map((id) => itemVariantApi.get(id)))
      const byId: Record<string, ItemVariant> = {}
      for (const result of results) {
        byId[result.data.data.id] = result.data.data
      }
      return byId
    },
    enabled: variantIds.length > 0 && isPanelOpen && canViewItems,
  })
  const variantDetailsById = variantDetailsQuery.data ?? {}

  const invalidateVariantPrices = () => {
    queryClient.invalidateQueries({ queryKey: priceListQueryKeys.variantPrices(priceListId) })
  }

  const handleNewVariantPrice = () => {
    setSelectedVariantPrice(null)
    setVariantPriceMode('create')
  }

  const handleVariantPriceClick = (variantPrice: VariantPrice) => {
    setSelectedVariantPrice(variantPrice)
    setVariantPriceMode('edit')
  }

  const handleBackToList = () => {
    setSelectedVariantPrice(null)
    setVariantPriceMode('list')
  }

  const handleVariantPriceSaved = () => {
    invalidateVariantPrices()
    setSelectedVariantPrice(null)
    setVariantPriceMode('list')
  }

  return {
    variantPrices,
    variantDetailsById,
    isLoading: variantPricesQuery.isLoading,
    isError: variantPricesQuery.isError,
    variantPriceMode,
    selectedVariantPrice,
    handleNewVariantPrice,
    handleVariantPriceClick,
    handleBackToList,
    handleVariantPriceSaved,
  }
}
