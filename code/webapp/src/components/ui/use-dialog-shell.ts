import { useCallback } from 'react'
import { useDialogTransition } from './use-dialog-transition'

/**
 * Shared close-guard + enter/exit transition wiring for centered dialogs
 * built on `<DialogFrame>` (backdrop, panel classes, ESC/backdrop close).
 */
export function useDialogShell(isOpen: boolean, isPending: boolean, handleClose: () => void, onClose: () => void) {
  const close = useCallback(() => {
    if (isPending) return
    handleClose()
    onClose()
  }, [isPending, handleClose, onClose])

  const { visible, backdropCls, panelCls } = useDialogTransition(isOpen, { onEscape: close, lockScroll: true })

  return { visible, backdropCls, panelCls, close }
}
