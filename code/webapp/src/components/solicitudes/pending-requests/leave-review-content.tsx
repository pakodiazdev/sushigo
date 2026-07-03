import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form-fields'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useLeaveTypes } from '@/services/leave-hooks'
import type { EmployeeRequest, LeavePayload } from '@/types/employee-request'
import { useLeaveReviewDialog } from './use-leave-review-dialog'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} — ${formatDate(endDate)}`
}

interface LeaveReviewContentProps {
  readonly request: EmployeeRequest
  readonly onClose: () => void
}

export function LeaveReviewContent({ request, onClose }: LeaveReviewContentProps) {
  const payload = request.payload as LeavePayload | null
  const { data: leaveTypes = [] } = useLeaveTypes()
  const leaveType = leaveTypes.find((t) => t.id === payload?.leave_type_id)

  const {
    showRejectConfirm,
    setShowRejectConfirm,
    rejectReason,
    setRejectReason,
    handleApprove,
    handleReject,
    isApproving,
    isRejecting,
  } = useLeaveReviewDialog(request, onClose)

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-sm font-semibold text-foreground">{leaveType?.name ?? 'Permiso'}</p>
          {payload && (
            <p className="text-sm text-foreground capitalize">
              {formatDateRange(payload.start_date, payload.end_date)}
            </p>
          )}
          {payload?.time_mode === 'SCHEDULED' && (
            <p className="text-xs text-muted-foreground">
              Horario: {payload.scheduled_start_time} – {payload.scheduled_end_time}
            </p>
          )}
          {payload?.time_mode === 'OPEN_ENDED' && (
            <p className="text-xs text-muted-foreground">
              Sale a las {payload.scheduled_start_time}, sin hora de regreso
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
            Aprobar permiso
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
              <label htmlFor="leave_reject_reason" className="text-xs font-medium text-foreground">
                Motivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="leave_reject_reason"
                placeholder="Ej: No hay cobertura suficiente ese día"
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
