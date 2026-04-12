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
  if (!isOpen) return null

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="overtime-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 w-full h-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-card rounded-xl border shadow-lg p-6 w-full max-w-sm mx-4 space-y-4"
        role="document"
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
            . ¿Se pagan?
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
      </div>
    </dialog>
  )
}
