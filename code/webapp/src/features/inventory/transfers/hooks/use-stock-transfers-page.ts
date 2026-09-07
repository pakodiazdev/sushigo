import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { stockTransferApi } from '../api/stock-transfer-api'
import { stockTransferQueryKeys } from '../api/query-keys'
import type { StockTransfer, StockTransferStatus, StockTransferSummary } from '../types'

/**
 * One SlidePanel instance that transitions its own content — mirrors the
 * Receipts page (features/purchasing/receipts/hooks/use-receipts-page.ts).
 *  - 'create': the new-Transfer draft form.
 *  - 'detail': the saved Transfer — editable actions when DRAFT, a read-only
 *    immutable view when POSTED or REVERSED.
 *  - 'edit': the same form, editing the selected DRAFT Transfer in place.
 */
export type StockTransferPanelMode = 'create' | 'detail' | 'edit'

const PAGE_SIZE = 15

export function useStockTransfersPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilterState, setStatusFilterState] = useState<StockTransferStatus | ''>('')
  const [searchQueryState, setSearchQueryState] = useState('')

  const setStatusFilter = (value: StockTransferStatus | '') => {
    setStatusFilterState(value)
    setCurrentPage(1)
  }
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value)
    setCurrentPage(1)
  }

  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<StockTransferPanelMode>('create')
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)

  const listParams = {
    page: currentPage,
    per_page: PAGE_SIZE,
    status: statusFilterState || undefined,
    search: searchQueryState || undefined,
  }

  const transfersQuery = useQuery({
    queryKey: stockTransferQueryKeys.list(listParams),
    queryFn: () => stockTransferApi.list(listParams),
  })

  const transfers = transfersQuery.data?.data.data ?? []
  const totalPages = transfersQuery.data?.data.meta.last_page ?? 1

  useEffect(() => {
    if (!transfersQuery.isFetching && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [transfersQuery.isFetching, currentPage, totalPages])

  useEffect(() => {
    if (transfersQuery.isError) {
      showError(getApiErrorMessage(transfersQuery.error, 'No fue posible cargar los traslados'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfersQuery.isError])

  const transferDetailQuery = useQuery({
    queryKey: selectedTransferId
      ? stockTransferQueryKeys.detail(selectedTransferId)
      : ['stock-transfers', 'detail', 'none'],
    queryFn: () => stockTransferApi.get(selectedTransferId as string),
    enabled: Boolean(selectedTransferId) && isPanelOpen && panelMode !== 'create',
  })

  const selectedTransfer: StockTransfer | null = transferDetailQuery.data?.data.data ?? null

  useEffect(() => {
    if (transferDetailQuery.isError) {
      showError(getApiErrorMessage(transferDetailQuery.error, 'No fue posible cargar el traslado'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferDetailQuery.isError])

  const invalidateLists = () =>
    queryClient.invalidateQueries({ queryKey: stockTransferQueryKeys.lists() })

  const closePanel = () => setIsPanelOpen(false)

  const applyUpdatedTransfer = (transfer: StockTransfer) => {
    queryClient.setQueryData(stockTransferQueryKeys.detail(transfer.id), {
      data: { data: transfer, status: 200 },
    })
    setSelectedTransferId(transfer.id)
    invalidateLists()
    setPanelMode('detail')
  }

  const deleteMutation = useMutation({
    mutationFn: (transferId: string) => stockTransferApi.delete(transferId),
    onSuccess: (_data, transferId) => {
      if (transfers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
      queryClient.removeQueries({ queryKey: stockTransferQueryKeys.detail(transferId) })
      invalidateLists()
      closePanel()
      showSuccess('Traslado eliminado', 'Traslado eliminado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No fue posible eliminar el traslado'), 'Error al eliminar')
    },
  })

  const postMutation = useMutation({
    mutationFn: (transferId: string) => stockTransferApi.post(transferId),
    onSuccess: (response) => {
      applyUpdatedTransfer(response.data.data)
      showSuccess('Traslado confirmado y aplicado al inventario', 'Traslado confirmado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No fue posible confirmar el traslado'), 'Error al confirmar')
    },
  })

  const reverseMutation = useMutation({
    mutationFn: ({ transferId, reason }: { transferId: string; reason: string }) =>
      stockTransferApi.reverse(transferId, { reason: reason || null }),
    onSuccess: (response) => {
      applyUpdatedTransfer(response.data.data)
      showSuccess('Traslado revertido', 'Traslado revertido')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No fue posible revertir el traslado'), 'Error al revertir')
    },
  })

  const handleRowClick = (transfer: StockTransferSummary) => {
    setSelectedTransferId(transfer.id)
    setPanelMode('detail')
    setIsPanelOpen(true)
  }

  const handleNewTransfer = () => {
    setSelectedTransferId(null)
    setPanelMode('create')
    setIsPanelOpen(true)
  }

  const handleEdit = () => setPanelMode('edit')
  const cancelEdit = () => setPanelMode('detail')
  const handleFormSaved = (transfer: StockTransfer) => applyUpdatedTransfer(transfer)

  const handleDelete = () => {
    if (selectedTransferId) deleteMutation.mutate(selectedTransferId)
  }
  const handlePost = () => {
    if (selectedTransferId) postMutation.mutate(selectedTransferId)
  }
  const handleReverse = (reason: string) => {
    if (selectedTransferId) reverseMutation.mutate({ transferId: selectedTransferId, reason })
  }

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    statusFilter: statusFilterState,
    setStatusFilter,
    searchQuery: searchQueryState,
    setSearchQuery,
    transfers,
    isLoading: transfersQuery.isLoading,
    isError: transfersQuery.isError,
    isPanelOpen,
    panelMode,
    selectedTransfer,
    isDetailLoading: transferDetailQuery.isLoading && panelMode !== 'create',
    handleRowClick,
    handleNewTransfer,
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
