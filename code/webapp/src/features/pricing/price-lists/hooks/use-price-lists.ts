import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { priceListApi } from '../api/pricing-api'
import { priceListQueryKeys } from '../api/query-keys'
import type { PriceList } from '../types'

/**
 * Single SlidePanel instance that transitions its own content instead of swapping between
 * two panel instances — mirrors ProductPanelMode (see
 * pages/inventory/use-products-list.ts).
 *  - 'create': the new-Price-List form.
 *  - 'detail': the saved Price List's read-only detail view (Assignments + Variant Prices
 *    sections embedded, plus the resolved-price preview).
 *  - 'edit': the same form, in-place, editing the selected Price List — Save returns to
 *    'detail' rather than opening a second top-level panel.
 */
export type PriceListPanelMode = 'create' | 'detail' | 'edit'

export interface UsePriceListsOptions {
  /** Called after a successful delete, once the panel has closed — mirrors
   *  useProductsList's onDeleted (no still-visible opener to return focus to). */
  onDeleted?: () => void
}

export function usePriceLists({ onDeleted }: UsePriceListsOptions = {}) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const [searchQueryState, setSearchQueryState] = useState('')
  const [statusFilterState, setStatusFilterState] = useState('')

  const setSearchQuery = (value: string) => {
    setSearchQueryState(value)
    setCurrentPage(1)
  }
  const setStatusFilter = (value: string) => {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<PriceListPanelMode>('create')
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null)

  const PAGE_SIZE = 15

  // The list endpoint has no `search` param (ListPriceListsController only filters on
  // is_active) — fetch every page up front (mirrors use-price-list-assignments.ts /
  // useOperatingUnitsSelect's own "fetch every page" approach) and narrow + paginate entirely
  // client-side, so a match past the first page is never missed.
  const priceListsQuery = useQuery({
    queryKey: priceListQueryKeys.list(statusFilterState),
    queryFn: async () => {
      const isActive = statusFilterState ? statusFilterState === 'active' : undefined
      const first = await priceListApi.list({ page: 1, per_page: 100, is_active: isActive })
      const lastPage = first.data.meta.last_page ?? 1
      if (lastPage <= 1) return first

      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          priceListApi.list({ page: index + 2, per_page: 100, is_active: isActive })
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
  })
  const allPriceLists = priceListsQuery.data?.data.data ?? []
  const filteredPriceLists = searchQueryState
    ? allPriceLists.filter(
        (priceList) =>
          priceList.name.toLowerCase().includes(searchQueryState.toLowerCase()) ||
          priceList.code.toLowerCase().includes(searchQueryState.toLowerCase())
      )
    : allPriceLists
  const totalPages = Math.max(1, Math.ceil(filteredPriceLists.length / PAGE_SIZE))
  const priceLists = filteredPriceLists.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    if (priceListsQuery.isError) {
      showError(getApiErrorMessage(priceListsQuery.error, 'Failed to load price lists'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceListsQuery.isError])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => priceListApi.delete(id),
    onSuccess: (_data, deletedPriceListId) => {
      if (priceLists.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === priceListQueryKeys.all[0] &&
          query.queryKey[1] !== deletedPriceListId,
      })
      closePanel()
      onDeleted?.()
      showSuccess('Price list deleted successfully', 'Price List Deleted')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'Failed to delete price list. It may have existing assignments or prices.'),
        'Delete Error'
      )
    },
  })

  const handleRowClick = (priceList: PriceList) => {
    setSelectedPriceList(priceList)
    setPanelMode('detail')
    setIsPanelOpen(true)
  }

  const handleNewPriceList = () => {
    setSelectedPriceList(null)
    setPanelMode('create')
    setIsPanelOpen(true)
  }

  const handleEdit = () => {
    setPanelMode('edit')
  }

  const cancelEdit = () => {
    setPanelMode('detail')
  }

  const handleDelete = () => {
    if (!selectedPriceList) return
    if (confirm('¿Estás seguro de eliminar esta lista de precios?')) {
      deleteMutation.mutate(selectedPriceList.id)
    }
  }

  const handleFormSaved = (priceList: PriceList) => {
    queryClient.invalidateQueries({ queryKey: priceListQueryKeys.all })
    setSelectedPriceList(priceList)
    setPanelMode('detail')
  }

  const closePanel = () => {
    setIsPanelOpen(false)
  }

  return {
    currentPage,
    setCurrentPage,
    searchQuery: searchQueryState,
    setSearchQuery,
    statusFilter: statusFilterState,
    setStatusFilter,
    priceLists,
    totalPages,
    isLoading: priceListsQuery.isLoading,
    isError: priceListsQuery.isError,
    isPanelOpen,
    panelMode,
    selectedPriceList,
    handleRowClick,
    handleNewPriceList,
    handleEdit,
    cancelEdit,
    handleDelete,
    handleCreated: handleFormSaved,
    handleUpdated: handleFormSaved,
    closePanel,
  }
}
