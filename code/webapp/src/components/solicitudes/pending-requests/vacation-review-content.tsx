import { Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form-fields'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDatesLabel } from '@/lib/format'
import type { EmployeeRequest, VacationPayload } from '@/types/employee-request'
import { useVacationReviewDialog } from './use-vacation-review-dialog'

interface VacationReviewContentProps {
  readonly request: EmployeeRequest
  readonly onClose: () => void
}

export function VacationReviewContent({ request, onClose }: VacationReviewContentProps) {
  const payload = request.payload as VacationPayload | null

  const {
    showRejectConfirm,
    setShowRejectConfirm,
    rejectReason,
    setRejectReason,
    handleApprove,
    handleReject,
    isApproving,
    isRejecting,
  } = useVacationReviewDialog(request, onClose)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Avatar name={request.employee_name} imageUrl={request.avatar_url} size="sm" />
          <p className="text-sm font-medium text-foreground">{request.employee_name}</p>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-sm font-semibold text-foreground">🌴 Vacaciones</p>
          {payload && (
            <p className="text-sm text-foreground capitalize">
              {formatDatesLabel(payload.dates, 'long')}
            </p>
          )}
          {request.notes && (
            <p className="text-xs text-muted-foreground italic">"{request.notes}"</p>
          )}
        </div>

        <div className="flex gap-3 justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setShowRejectConfirm(true)}
            disabled={isApproving || isRejecting}
          >
            Rechazar
          </Button>
          <Button type="button" onClick={handleApprove} disabled={isApproving || isRejecting}>
            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar vacaciones
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={handleReject}
        title="Rechazar solicitud"
        description={
          <div className="space-y-3">
            <p>¿Confirmas que deseas rechazar la solicitud de {request.employee_name}?</p>
            <div className="space-y-1">
              <label htmlFor="vacation_reject_reason" className="text-xs font-medium text-foreground">
                Motivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="vacation_reject_reason"
                placeholder="Ej: No hay cobertura suficiente esos días"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
        }
        confirmLabel="Rechazar"
        variant="danger"
        isLoading={isRejecting}
      />
    </>
  )
}
