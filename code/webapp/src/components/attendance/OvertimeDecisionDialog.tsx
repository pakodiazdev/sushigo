import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface OvertimeDecisionDialogProps {
  isOpen: boolean
  employeeName: string
  overtimeMinutes: number
  isLoading: boolean
  onAuthorize: () => void
  onReject: () => void
  onClose: () => void
}

/**
 * Confirmation dialog for overtime payment decision.
 * Shows "Pagar" (authorize) and "No pagar" (reject) actions.
 * Supports Escape-to-close and locks background scroll while open.
 */
export function OvertimeDecisionDialog({
  isOpen,
  employeeName,
  overtimeMinutes,
  isLoading,
  onAuthorize,
  onReject,
  onClose,
}: Readonly<OvertimeDecisionDialogProps>) {
  // Escape key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, isLoading, onClose])

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default appearance-none border-none p-0"
        onClick={() => { if (!isLoading) onClose() }}
        aria-label="Cerrar diálogo"
      />

      {/* Panel */}
      <dialog
        open
        aria-modal="true"
        aria-labelledby="overtime-dialog-title"
        className="relative z-10 bg-card rounded-xl border shadow-lg p-6 w-full max-w-sm mx-4 space-y-4"
      >
        <div className="space-y-1">
          <h2
            id="overtime-dialog-title"
            className="text-lg font-semibold text-foreground"
          >
            Decisión de horas extra
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{employeeName}</span>
            {' '}trabajó{' '}
            <span className="font-semibold text-yellow-700 dark:text-yellow-400">
              {overtimeMinutes} min extra
            </span>
            {'. ¿Se pagan?'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={onAuthorize}
            disabled={isLoading}
            data-testid="btn-authorize-overtime"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Pagar horas extra
          </Button>

          <Button
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={onReject}
            disabled={isLoading}
            data-testid="btn-reject-overtime"
          >
            <XCircle className="h-4 w-4 mr-2" />
            No pagar
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
