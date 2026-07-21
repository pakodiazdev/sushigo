import { useDialogAnimation } from './use-dialog-animation'

/**
 * Shared close-guard + enter/exit animation wiring for the confirm-style
 * dialogs in this directory (backdrop, panel classes, ESC/backdrop close).
 */
export function useDialogShell(isOpen: boolean, isPending: boolean, handleClose: () => void, onClose: () => void) {
  const close = () => {
    if (isPending) return
    handleClose()
    onClose()
  }

  const { visible, backdropCls, panelCls } = useDialogAnimation(isOpen, close)

  return { visible, backdropCls, panelCls, close }
}
