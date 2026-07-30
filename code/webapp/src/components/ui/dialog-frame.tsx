/**
 * Shared backdrop + <dialog> wrapper for centered dialogs — header and body
 * content are supplied via children.
 */
export interface DialogFrameProps {
  readonly backdropCls: string
  readonly panelCls: string
  readonly dialogId: string
  readonly onBackdropClick: () => void
  readonly children: React.ReactNode
}

export function DialogFrame({ backdropCls, panelCls, dialogId, onBackdropClick, children }: DialogFrameProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropCls} cursor-default appearance-none border-none p-0`}
        onClick={onBackdropClick}
        aria-label="Cerrar diálogo"
      />

      {/* Dialog */}
      <dialog
        open
        aria-labelledby={dialogId}
        className={`relative z-10 w-full max-w-lg rounded-lg border border-border bg-background shadow-xl ${panelCls}`}
      >
        {children}
      </dialog>
    </div>
  )
}
