import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { receiptApi } from '../api/receipt-api'
import { receiptQueryKeys } from '../api/query-keys'
import type { Receipt, ReceiptStatus, ReceiptSummary } from '../types'

/**
 * Single SlidePanel instance that transitions its own content — mirrors PriceListPanelMode
 * (see features/pricing/price-lists/hooks/use-price-lists.ts).
 *  - 'create': the new-Receipt draft form.
 *  - 'detail': the saved Receipt's detail view — editable actions when DRAFT, a read-only
 *    immutable view when POSTED or REVERSED.
 *  - 'edit': the same form, in place, editing the selected DRAFT Receipt.
 */
export type ReceiptPanelMode = 'create' | 'detail' | 'edit'

const PAGE_SIZE = 15

export function useReceiptsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilterState, setStatusFilterState] = useState<ReceiptStatus | ''>('')
  const [searchQueryState, setSearchQueryState] = useState('')

  // Every list criterion narrows/widens the result set, so the page the user was on
  // may no longer exist — reset to page 1 alongside each setter instead of leaving
  // currentPage stale (mirrors use-products-list.ts).
  const setStatusFilter = (value: ReceiptStatus | '') => {
    setStatusFilterState(value)
    setCurrentPage(1)
  }
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value)
    setCurrentPage(1)
  }

  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<ReceiptPanelMode>('create')
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<ReceiptSummary | null>(null)

  const listParams = {
    page: currentPage,
    per_page: PAGE_SIZE,
    status: statusFilterState || undefined,
    search: searchQueryState || undefined,
  }

  const receiptsQuery = useQuery({
    queryKey: receiptQueryKeys.list(listParams),
    queryFn: () => receiptApi.list(listParams),
  })

  const receipts = receiptsQuery.data?.data.data ?? []
  const totalPages = receiptsQuery.data?.data.meta.last_page ?? 1

  // A refetch can shrink the result set below the page the user is on — a status
  // filter narrowing the set, or posting/reversing the last row of a filtered page
  // (delete has its own eager step-back below, but post/reverse go through
  // applyUpdatedReceipt and only invalidate). DataGrid hides its pager when the
  // page comes back empty, so without this the user is stranded. Clamp down to the
  // real last page once the fresh count is in.
  useEffect(() => {
    if (!receiptsQuery.isFetching && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [receiptsQuery.isFetching, currentPage, totalPages])

  // Once retries are exhausted `receipts` quietly falls back to [] — surface a real
  // fetch failure so the empty grid isn't mistaken for "no receipts yet".
  useEffect(() => {
    if (receiptsQuery.isError) {
      showError(getApiErrorMessage(receiptsQuery.error, 'No fue posible cargar las recepciones'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptsQuery.isError])

  // The list is a summary read model (#586) — it carries no `lines`. Fetch the full
  // Receipt when a row is opened for detail/edit.
  const receiptDetailQuery = useQuery({
    queryKey: selectedReceiptId ? receiptQueryKeys.detail(selectedReceiptId) : ['receipts', 'detail', 'none'],
    queryFn: () => receiptApi.get(selectedReceiptId as string),
    enabled: Boolean(selectedReceiptId) && isPanelOpen && panelMode !== 'create',
  })

  const selectedReceipt: Receipt | null = receiptDetailQuery.data?.data.data ?? null

  useEffect(() => {
    if (receiptDetailQuery.isError) {
      showError(getApiErrorMessage(receiptDetailQuery.error, 'No fue posible cargar la recepción'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptDetailQuery.isError])

  const invalidateLists = () => queryClient.invalidateQueries({ queryKey: receiptQueryKeys.lists() })

  // Posting or reversing a Receipt moves Stock, its weighted-average cost, the
  // Variant-to-Location assortment (#569/#572) and appends a Stock Movement
  // (#574) — every downstream read model the operator might have open needs to
  // refetch, not just the Receipt list.
  const invalidateInventoryReadModels = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-all'] })
    queryClient.invalidateQueries({ queryKey: ['stock-by-location'] })
    queryClient.invalidateQueries({ queryKey: ['variant-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const closePanel = () => setIsPanelOpen(false)

  // post/reverse return the full, updated Receipt — write it straight to the detail
  // cache (source of truth for the open panel) and only invalidate the list pages,
  // so the panel never flickers through a stale refetch of the row it just changed.
  const applyUpdatedReceipt = (receipt: Receipt) => {
    queryClient.setQueryData(receiptQueryKeys.detail(receipt.id), { data: { data: receipt, status: 200 } })
    setSelectedReceiptId(receipt.id)
    invalidateLists()
    invalidateInventoryReadModels()
    setPanelMode('detail')
  }

  const deleteMutation = useMutation({
    mutationFn: (receiptId: string) => receiptApi.delete(receiptId),
    onSuccess: (_data, receiptId) => {
      // Deleting the only row on a page past page 1 leaves currentPage past the new
      // last_page once the list refetches — step back a page instead.
      if (receipts.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
      queryClient.removeQueries({ queryKey: receiptQueryKeys.detail(receiptId) })
      invalidateLists()
      closePanel()
      showSuccess('Recepción eliminada', 'Recepción Eliminada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No fue posible eliminar la recepción'), 'Error al Eliminar')
    },
  })

  const postMutation = useMutation({
    mutationFn: (receiptId: string) => receiptApi.post(receiptId),
    onSuccess: (response) => {
      applyUpdatedReceipt(response.data.data)
      showSuccess('Recepción confirmada y aplicada al inventario', 'Recepción Confirmada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No fue posible confirmar la recepción'), 'Error al Confirmar')
    },
  })

  const reverseMutation = useMutation({
    mutationFn: ({ receiptId, reason }: { receiptId: string; reason: string }) =>
      receiptApi.reverse(receiptId, { reason: reason || null }),
    onSuccess: (response) => {
      applyUpdatedReceipt(response.data.data)
      showSuccess('Recepción revertida', 'Recepción Revertida')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No fue posible revertir la recepción'), 'Error al Revertir')
    },
  })

  const handleRowClick = (receipt: ReceiptSummary) => {
    setSelectedSummary(receipt)
    setSelectedReceiptId(receipt.id)
    setPanelMode('detail')
    setIsPanelOpen(true)
  }

  const handleNewReceipt = () => {
    setSelectedSummary(null)
    setSelectedReceiptId(null)
    setPanelMode('create')
    setIsPanelOpen(true)
  }

  const handleEdit = () => setPanelMode('edit')
  const cancelEdit = () => setPanelMode('detail')

  const handleFormSaved = (receipt: Receipt) => applyUpdatedReceipt(receipt)

  const handleDelete = () => {
    if (selectedReceiptId) deleteMutation.mutate(selectedReceiptId)
  }
  const handlePost = () => {
    if (selectedReceiptId) postMutation.mutate(selectedReceiptId)
  }
  const handleReverse = (reason: string) => {
    if (selectedReceiptId) reverseMutation.mutate({ receiptId: selectedReceiptId, reason })
  }

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    statusFilter: statusFilterState,
    setStatusFilter,
    searchQuery: searchQueryState,
    setSearchQuery,
    receipts,
    isLoading: receiptsQuery.isLoading,
    isError: receiptsQuery.isError,
    isPanelOpen,
    panelMode,
    selectedReceipt,
    selectedSummary,
    isDetailLoading: receiptDetailQuery.isLoading && panelMode !== 'create',
    handleRowClick,
    handleNewReceipt,
    handleEdit,
    cancelEdit,
    handleDelete,
    handlePost,
    handleReverse,
    handleCreated: handleFormSaved,
    handleUpdated: handleFormSaved,
    closePanel,
    isDeleting: deleteMutation.isPending,
    isPosting: postMutation.isPending,
    isReversing: reverseMutation.isPending,
  }
}
