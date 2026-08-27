import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { brandApi, inventoryCategoryApi, productApi } from '@/services/inventory-api'
import type { Product } from '@/types/inventory'

/**
 * The panel is a single SlidePanel instance that transitions its own content
 * instead of swapping between two panel instances — see
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.
 *  - 'create': the new-Product form.
 *  - 'detail': the saved Product's read-only detail view.
 *  - 'edit': the same form, in-place, editing the selected Product — Save
 *    returns to 'detail' rather than opening a second top-level panel.
 */
export type ProductPanelMode = 'create' | 'detail' | 'edit'

export interface UseProductsListOptions {
  /**
   * Called after a successful delete, once the panel has closed. Unlike the
   * New Product / row-click openers, the delete trigger lives inside the
   * panel being closed and the deleted row is gone from the DOM after
   * refetch, so there's no still-visible opener to return focus to — the
   * page is expected to move focus to a graceful fallback (e.g. the New
   * Product button) instead of leaving it stranded on document.body.
   */
  onDeleted?: () => void
}

export function useProductsList({ onDeleted }: UseProductsListOptions = {}) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const [searchQueryState, setSearchQueryState] = useState('')
  const [brandFilterState, setBrandFilterState] = useState('')
  const [categoryFilterState, setCategoryFilterState] = useState('')
  const [statusFilterState, setStatusFilterState] = useState('')

  // Changing any list criterion narrows/widens the result set, so the page the user
  // was on may no longer exist (e.g. filtering while on page 3 can leave 0 rows on
  // page 3 even though page 1 has matches) — reset to page 1 alongside every setter
  // instead of leaving currentPage stale.
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value)
    setCurrentPage(1)
  }
  const setBrandFilter = (value: string) => {
    setBrandFilterState(value)
    setCurrentPage(1)
  }
  const setCategoryFilter = (value: string) => {
    setCategoryFilterState(value)
    setCurrentPage(1)
  }
  const setStatusFilter = (value: string) => {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<ProductPanelMode>('create')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Unfiltered (active + inactive) — distinct from useProductForm's active-only
  // queries. A Product may stay assigned to a brand/category that's since gone
  // inactive (ListProductsRequest accepts any non-deleted id, active or not — see
  // ListProductsController), and it's still returned by the list under All/Inactive,
  // so the filter picker must let the user narrow down to that assignment too.
  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandApi.list(),
  })
  const brands = brandsQuery.data?.data.data ?? []

  const categoriesQuery = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventoryCategoryApi.list(),
  })
  const categories = categoriesQuery.data?.data.data ?? []

  const productsQuery = useQuery({
    queryKey: [
      'products',
      currentPage,
      searchQueryState,
      brandFilterState,
      categoryFilterState,
      statusFilterState,
    ],
    queryFn: () =>
      productApi.list({
        page: currentPage,
        per_page: 15,
        search: searchQueryState || undefined,
        brand_id: brandFilterState || undefined,
        inventory_category_id: categoryFilterState || undefined,
        is_active: statusFilterState ? statusFilterState === 'active' : undefined,
      }),
  })
  const products = productsQuery.data?.data.data ?? []
  const totalPages = productsQuery.data?.data.meta.last_page ?? 1

  // Once retries are exhausted, `products` above quietly falls back to [] — without
  // this, a genuine fetch failure renders identically to "the catalog has no rows",
  // and the DataGrid empty state misleads the user into thinking there's nothing to
  // see rather than that the request failed. Surface it the same way categoriesQuery
  // errors are surfaced in use-dishes-list.ts.
  useEffect(() => {
    if (productsQuery.isError) {
      showError(getApiErrorMessage(productsQuery.error, 'Failed to load products'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsQuery.isError])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: (_data, deletedProductId) => {
      // Deleting the only row on a page past page 1 leaves currentPage pointing past
      // the new last_page once the list refetches — DataGrid renders its empty state
      // before pagination controls in that case, so the user would have no way back
      // to the products that still exist. Step back a page instead of leaving
      // currentPage stale.
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
      // closePanel() below only flips isPanelOpen; that state update hasn't rendered yet at
      // this point in the callback, so useProductVariants' own `enabled` gate (see
      // use-product-variants.ts) is still true right now. A plain ['products'] prefix
      // invalidation would therefore still refetch the just-deleted product's own Variant
      // query synchronously, 404, and surface a spurious "Failed to load variants" toast
      // right after this success toast. Exclude that one query from the invalidation instead
      // of relying on render timing to disable it in time.
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'products' &&
          !(query.queryKey[1] === deletedProductId && query.queryKey[2] === 'variants'),
      })
      closePanel()
      onDeleted?.()
      showSuccess('Product deleted successfully', 'Product Deleted')
    },
    onError: (error: unknown, deletedProductId: string) => {
      // handleDelete cancels this same query before the delete request goes out (see below) so a
      // slow in-flight fetch can't resolve into a spurious toast after a *successful* delete. If
      // the delete then fails instead, that cancellation would otherwise leave the query stuck
      // with no data and no pending fetch — refetch it so the still-open panel recovers.
      queryClient.invalidateQueries({ queryKey: ['products', deletedProductId, 'variants'] })
      showError(
        getApiErrorMessage(error, 'Failed to delete product. It may have existing variants.'),
        'Delete Error'
      )
    },
  })

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product)
    setPanelMode('detail')
    setIsPanelOpen(true)
  }

  const handleNewProduct = () => {
    setSelectedProduct(null)
    setPanelMode('create')
    setIsPanelOpen(true)
  }

  const handleEdit = () => {
    setPanelMode('edit')
  }

  // Cancel from 'edit' returns to 'detail' in the same panel instance (no close/reopen) —
  // distinct from cancelling 'create', which closes the panel entirely (closePanel).
  const cancelEdit = () => {
    setPanelMode('detail')
  }

  const handleDelete = () => {
    if (!selectedProduct) return
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      // If the panel's initial Variant fetch is still in flight (e.g. the user opens a
      // Product and immediately deletes it before that GET resolves), the predicate-based
      // invalidation in deleteMutation.onSuccess only stops a *new* refetch — it can't stop
      // one already underway. That in-flight GET can still resolve with a 404 after the
      // delete succeeds and surface a spurious "Failed to load variants" toast. Cancel it
      // before the delete goes out so TanStack Query discards whatever it eventually
      // resolves with.
      queryClient.cancelQueries({ queryKey: ['products', selectedProduct.id, 'variants'] })
      deleteMutation.mutate(selectedProduct.id)
    }
  }

  // Fires on successful create or update — the whole point of this issue: the panel
  // stays open and transitions in place to the saved Product's detail state, no
  // navigation. Exposed under two names (handleCreated/handleUpdated) since
  // products.tsx wires ProductForm's onSuccess per panel mode, though the behavior
  // is currently identical for both.
  const handleFormSaved = (product: Product) => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    setSelectedProduct(product)
    setPanelMode('detail')
  }

  // SlidePanel keeps its content mounted for the full exit-animation duration after
  // isOpen flips false (see slide-panel.tsx), so resetting selectedProduct/panelMode
  // here would flip the visible content to a blank "New Product" form mid-slide-out.
  // handleRowClick/handleNewProduct already set both fresh before the next open, so
  // there's nothing to reset on close beyond isPanelOpen itself.
  const closePanel = () => {
    setIsPanelOpen(false)
  }

  return {
    currentPage,
    setCurrentPage,
    searchQuery: searchQueryState,
    setSearchQuery,
    brandFilter: brandFilterState,
    setBrandFilter,
    categoryFilter: categoryFilterState,
    setCategoryFilter,
    statusFilter: statusFilterState,
    setStatusFilter,
    brands,
    categories,
    products,
    totalPages,
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    isPanelOpen,
    panelMode,
    selectedProduct,
    handleRowClick,
    handleNewProduct,
    handleEdit,
    cancelEdit,
    handleDelete,
    handleCreated: handleFormSaved,
    handleUpdated: handleFormSaved,
    closePanel,
  }
}
