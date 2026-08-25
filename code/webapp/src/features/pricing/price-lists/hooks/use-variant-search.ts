import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { itemVariantApi } from '@/services/inventory-api'
import { priceListQueryKeys } from '../api/query-keys'
import type { ItemVariant } from '@/types/inventory'

/**
 * Search Product Variants across every Product, for the Variant picker inside a Variant
 * Price / resolved-price-preview form — this is the only place in the pricing UI that needs
 * an unscoped Variant lookup (VariantPrice/PriceResolution key on item_variant_id directly,
 * not on a specific Product). Reuses the legacy `/item-variants` endpoint scoped to
 * `item_type=PRODUCTO`, since that endpoint already supports free-text search across
 * code/name — see ListItemVariantsController. Distinct from `productVariantApi`, which is
 * always scoped to one Product's own route and has no cross-catalog search.
 */
export function useVariantSearch(enabled = true) {
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: priceListQueryKeys.variantSearch(search),
    queryFn: () =>
      itemVariantApi.list({
        item_type: 'PRODUCTO',
        is_active: true,
        search: search || undefined,
        per_page: 20,
      }),
    enabled,
  })

  const variants: ItemVariant[] = query.data?.data.data ?? []

  return {
    search,
    setSearch,
    variants,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
