import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { productVariantApi } from '@/services/inventory-api'
import type { ProductVariant } from '@/types/inventory'

/**
 * Nested state for the embedded Variant catalog inside a Product's detail SlidePanel — see
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.2. This extends the
 * same top-level panel instance rather than opening a second one (per that doc's As-built
 * note on #423): 'list' is the normal Product-detail view (general info + the Variant catalog
 * embedded inline); 'create'/'detail'/'edit' each take over the whole panel body/footer until
 * the user goes Back, mirroring how the top-level panelMode already swaps its own content.
 */
export type VariantPanelMode = 'list' | 'create' | 'detail' | 'edit'

export function useProductVariants(productId: number | null, isPanelOpen: boolean) {
  const queryClient = useQueryClient()
  const { showError } = useToast()

  const [variantMode, setVariantMode] = useState<VariantPanelMode>('list')
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Reset to the list view on every fresh open (isPanelOpen flipping false -> true), not just
  // when productId changes — reopening the *same* Product (productId unchanged) after closing
  // mid-nested-Variant-screen must not silently reopen back into that nested screen instead of
  // the Product's own detail view. Keyed on the open transition specifically, not plain
  // `isPanelOpen`, so this doesn't fire on close and flash the list during the exit animation
  // (SlidePanel keeps content mounted through it — see use-products-list.ts's own closePanel).
  // useLayoutEffect, not useEffect: SlidePanel keeps its content mounted through the full
  // exit animation (350ms — see slide-panel.tsx), so a close-then-reopen (same or a
  // different Product) within that window can still have `isPanelOpen` flip back to true
  // while `visible` is still true from the previous render. A passive effect runs after
  // paint, so the stale nested Variant screen (wrong product's variant, wrong title) would
  // flash for one frame before correcting; useLayoutEffect resets it before the browser
  // paints that frame.
  const wasPanelOpenRef = useRef(false)
  useLayoutEffect(() => {
    if (isPanelOpen && !wasPanelOpenRef.current) {
      setVariantMode('list')
      setSelectedVariant(null)
    }
    wasPanelOpenRef.current = isPanelOpen
  }, [isPanelOpen])

  const variantsQuery = useQuery({
    queryKey: ['products', productId, 'variants'],
    // Fetches every page up front rather than exposing pagination controls in this compact
    // embedded card — a Product with more than one page of Variants (per_page caps at 100
    // server-side) must not silently drop the rest, or disagree with the parent's own
    // variants_count. See doc/architecture/product-catalog/product-catalog-architecture.en.md §5.1.
    queryFn: async () => {
      const first = await productVariantApi.list(productId!, { per_page: 100, page: 1 })
      const lastPage = first.data.meta.last_page ?? 1
      if (lastPage <= 1) return first

      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          productVariantApi.list(productId!, { per_page: 100, page: index + 2 })
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
    // Must stay disabled while the panel is closed — after a Product delete, selectedProduct
    // (and thus productId) is not cleared until the next open, so `productId != null` alone
    // would keep this query enabled and refetch the now-deleted product's Variants on the
    // ['products'] invalidation that follows the delete (see use-products-list.ts's
    // deleteMutation), surfacing a spurious "Failed to load variants" toast right after the
    // delete success toast.
    enabled: productId != null && isPanelOpen,
  })
  const variants = variantsQuery.data?.data.data ?? []

  // Mirrors use-products-list.ts's own productsQuery.isError handling — a failed fetch must
  // not render identically to "this Product has no Variants yet".
  useEffect(() => {
    if (variantsQuery.isError) {
      showError(getApiErrorMessage(variantsQuery.error, 'Failed to load variants'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsQuery.isError])

  const invalidateVariants = () => {
    queryClient.invalidateQueries({ queryKey: ['products', productId, 'variants'] })
  }

  const handleNewVariant = () => {
    setSelectedVariant(null)
    setVariantMode('create')
  }

  const handleVariantClick = (variant: ProductVariant) => {
    setSelectedVariant(variant)
    setVariantMode('detail')
  }

  const handleEditVariant = () => {
    setVariantMode('edit')
  }

  // Cancel from 'edit' returns to 'detail' (same as Product's own cancelEdit) — distinct from
  // cancelling 'create', which goes back to the list.
  const cancelEditVariant = () => {
    setVariantMode('detail')
  }

  const handleBackToList = () => {
    setSelectedVariant(null)
    setVariantMode('list')
  }

  const handleVariantCreated = (variant: ProductVariant) => {
    invalidateVariants()
    // A new Variant changes the parent Product's own variants_count, which the outer products
    // list (DataGrid) displays and caches separately — see Technical Task "Synchronize
    // Product/Variant query caches after mutations". An update/deactivate doesn't need this,
    // since it never changes the count.
    queryClient.invalidateQueries({ queryKey: ['products'] })
    setSelectedVariant(variant)
    setVariantMode('detail')
  }

  const handleVariantUpdated = (variant: ProductVariant) => {
    invalidateVariants()
    setSelectedVariant(variant)
    setVariantMode('detail')
  }

  return {
    variants,
    isLoading: variantsQuery.isLoading,
    isError: variantsQuery.isError,
    variantMode,
    selectedVariant,
    handleNewVariant,
    handleVariantClick,
    handleEditVariant,
    cancelEditVariant,
    handleBackToList,
    handleVariantCreated,
    handleVariantUpdated,
  }
}
