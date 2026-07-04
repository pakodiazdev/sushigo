import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-fields'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { groupContiguousDates } from '@/lib/format'
import { useLeaveTypes } from '@/services/leave-hooks'
import type { EmployeeRequest, LeavePayload } from '@/types/employee-request'
import { useLeaveReviewDialog } from './use-leave-review-dialog'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDatesLabel(dates: string[]): string {
  return groupContiguousDates(dates)
    .map((run) => run.length === 1 ? formatDate(run[0]!) : `${formatDate(run[0]!)} — ${formatDate(run[run.length - 1]!)}`)
    .join(', ')
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
    payType,
    payPercentage,
    selectUnpaid,
    selectPaid,
    selectCustom,
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
              {formatDatesLabel(payload.dates)}
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

        {/* Pay percentage — decided by the admin/manager at approval time */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Goce de sueldo</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="leave_pay_type"
              checked={payType === 'unpaid'}
              onChange={selectUnpaid}
              className="accent-primary"
            />
            <span className="text-sm text-foreground flex-1">Sin goce de sueldo</span>
            <span className="text-sm font-medium">0%</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="leave_pay_type"
              checked={payType === 'paid'}
              onChange={selectPaid}
              className="accent-primary"
            />
            <span className="text-sm text-foreground flex-1">Con goce de sueldo</span>
            <span className="text-sm font-medium">100%</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="leave_pay_type"
              checked={payType === 'custom'}
              onChange={() => selectCustom(payPercentage)}
              className="accent-primary mt-0.5"
            />
            <div className="space-y-2 flex-1">
              <span className="text-sm text-foreground">Porcentaje personalizado</span>
              {payType === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="w-20"
                    value={payPercentage}
                    onChange={(e) => selectCustom(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </label>
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
