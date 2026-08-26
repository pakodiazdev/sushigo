import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { receiptApi } from '../api/receipt-api'
import { receiptQueryKeys } from '../api/query-keys'
import type { Receipt, ReceiptStatus } from '../types'

/**
 * Single SlidePanel instance that transitions its own content — mirrors PriceListPanelMode
 * (see features/pricing/price-lists/hooks/use-price-lists.ts).
 *  - 'create': the new-Receipt draft form.
 *  - 'detail': the saved Receipt's detail view — editable actions when DRAFT, a read-only
 *    immutable view when POSTED or REVERSED.
 *  - 'edit': the same form, in place, editing the selected DRAFT Receipt.
 */
export type ReceiptPanelMode = 'create' | 'detail' | 'edit'

export function useReceiptsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<ReceiptPanelMode>('create')
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)

  const receiptsQuery = useQuery({
    queryKey: receiptQueryKeys.list(statusFilter),
    queryFn: () => receiptApi.list({ status: statusFilter || undefined }),
  })

  const allReceipts = receiptsQuery.data?.data.data ?? []
  const receipts = searchQuery
    ? allReceipts.filter((receipt) => {
        const haystack = [receipt.reference, receipt.supplier?.name, receipt.destination_location?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(searchQuery.toLowerCase())
      })
    : allReceipts

  const invalidateReceipts = () => queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all })

  const closePanel = () => setIsPanelOpen(false)

  const applyUpdatedReceipt = (receipt: Receipt) => {
    invalidateReceipts()
    setSelectedReceipt(receipt)
    setPanelMode('detail')
  }

  const deleteMutation = useMutation({
    mutationFn: (receiptId: string) => receiptApi.delete(receiptId),
    onSuccess: () => {
      invalidateReceipts()
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

  const handleRowClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setPanelMode('detail')
    setIsPanelOpen(true)
  }

  const handleNewReceipt = () => {
    setSelectedReceipt(null)
    setPanelMode('create')
    setIsPanelOpen(true)
  }

  const handleEdit = () => setPanelMode('edit')
  const cancelEdit = () => setPanelMode('detail')

  const handleFormSaved = (receipt: Receipt) => applyUpdatedReceipt(receipt)

  const handleDelete = () => {
    if (selectedReceipt) deleteMutation.mutate(selectedReceipt.id)
  }
  const handlePost = () => {
    if (selectedReceipt) postMutation.mutate(selectedReceipt.id)
  }
  const handleReverse = (reason: string) => {
    if (selectedReceipt) reverseMutation.mutate({ receiptId: selectedReceipt.id, reason })
  }

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    receipts,
    isLoading: receiptsQuery.isLoading,
    isError: receiptsQuery.isError,
    isPanelOpen,
    panelMode,
    selectedReceipt,
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
