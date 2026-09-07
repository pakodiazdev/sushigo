import { useState } from 'react'

/**
 * Local confirm-dialog state for StockTransferDetails' three status-transition
 * actions — delete/post (DRAFT) and reverse (POSTED), each gated behind its own
 * ConfirmDialog. Mirrors use-receipt-details.ts.
 */
export function useStockTransferDetails() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPostConfirm, setShowPostConfirm] = useState(false)
  const [showReverseConfirm, setShowReverseConfirm] = useState(false)
  const [reverseReason, setReverseReason] = useState('')

  const openReverseConfirm = () => {
    setReverseReason('')
    setShowReverseConfirm(true)
  }

  return {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showPostConfirm,
    setShowPostConfirm,
    showReverseConfirm,
    setShowReverseConfirm,
    reverseReason,
    setReverseReason,
    openReverseConfirm,
  }
}
