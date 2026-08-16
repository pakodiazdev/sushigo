import { Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-fields'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency, formatDatesLabel } from '@/lib/format'
import { useLeaveTypes } from '@/services/leave-hooks'
import type { EmployeeRequest, LeavePayload } from '@/types/employee-request'
import { LEAVE_QUICK_PAY_PERCENTAGES, useLeaveReviewDialog } from './use-leave-review-dialog'

function quickOptionLabel(pct: number): string {
  if (pct === 0) return 'Sin goce de sueldo'
  if (pct === 100) return 'Con goce de sueldo'
  return `${pct}%`
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
    requestedPayPercentage,
    payOption,
    payPercentage,
    payAmount,
    dailyWage,
    totalDays,
    amountForPercentage,
    selectQuickOption,
    selectCustomOption,
    setCustomPercentage,
    setCustomAmount,
    handleApprove,
    handleReject,
    isApproving,
    isRejecting,
  } = useLeaveReviewDialog(request, onClose)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Avatar name={request.employee_name} imageUrl={request.avatar_url} size="sm" />
          <p className="text-sm font-medium text-foreground">{request.employee_name}</p>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-sm font-semibold text-foreground">{leaveType?.name ?? 'Permiso'}</p>
          {payload && (
            <p className="text-sm text-foreground capitalize">
              {formatDatesLabel(payload.dates, 'long')}
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
          {requestedPayPercentage !== null && (
            <p className="text-xs text-muted-foreground">
              El empleado solicitó: {requestedPayPercentage > 0 ? 'con goce de sueldo' : 'sin goce de sueldo'}
            </p>
          )}
        </div>

        {/* Pay percentage — decided by the admin/manager at approval time */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Goce de sueldo</p>
          {dailyWage > 0 && (
            <p className="text-xs text-muted-foreground">
              Sueldo diario registrado: {formatCurrency(dailyWage)} · {totalDays} día{totalDays === 1 ? '' : 's'} solicitado{totalDays === 1 ? '' : 's'}
            </p>
          )}

          {LEAVE_QUICK_PAY_PERCENTAGES.map((pct) => (
            <label key={pct} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="leave_pay_option"
                checked={payOption === pct}
                onChange={() => selectQuickOption(pct)}
                className="accent-primary"
              />
              <span className="text-sm text-foreground flex-1">{quickOptionLabel(pct)}</span>
              {dailyWage > 0 && (
                <span className="text-sm font-medium">{formatCurrency(amountForPercentage(pct))}</span>
              )}
            </label>
          ))}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="leave_pay_option"
              checked={payOption === 'custom'}
              onChange={selectCustomOption}
              className="accent-primary mt-0.5"
            />
            <div className="space-y-2 flex-1">
              <span className="text-sm text-foreground">Porcentaje personalizado</span>
              {payOption === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="w-20"
                      value={payPercentage}
                      onChange={(e) => setCustomPercentage(Number(e.target.value))}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  {dailyWage > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">=</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28"
                          value={Math.round(payAmount * 100) / 100}
                          onChange={(e) => setCustomAmount(Number(e.target.value))}
                        />
                      </div>
                    </>
                  )}
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
