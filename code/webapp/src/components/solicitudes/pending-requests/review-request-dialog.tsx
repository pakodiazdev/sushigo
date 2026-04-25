import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency } from '@/lib/format'
import type { EmployeeRequest, ExtraDayPayload } from '@/types/employee-request'
import { useReviewRequestDialog } from './use-review-request-dialog'

interface ReviewRequestDialogProps {
  readonly request: EmployeeRequest | null
  readonly onClose: () => void
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function InnerDialog({ request, onClose }: { readonly request: EmployeeRequest; readonly onClose: () => void }) {
  const payload = request.payload as ExtraDayPayload | null
  const date = payload?.date ?? ''

  const {
    form,
    salaryDay,
    prima,
    seventhDay,
    total,
    effectivePrimaPct,
    proposedSalaryDay,
    proposedPrimaPct,
    showRejectConfirm,
    setShowRejectConfirm,
    handleApprove,
    handleReject,
    isApproving,
    isRejecting,
  } = useReviewRequestDialog(request, onClose)

  const { register, watch, setValue, formState: { errors }, handleSubmit } = form
  const salaryType = watch('salary_type')
  const primaType = watch('prima_type')
  const rejectReason = watch('reject_reason')

  return (
    <>
      <form onSubmit={handleSubmit(handleApprove)} className="space-y-6">
        {/* Header info */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground capitalize">{date ? formatDate(date) : '—'}</p>
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Propuesta del empleado</p>
            <p className="text-sm text-foreground">
              Prima: {proposedPrimaPct}% = {formatCurrency((proposedSalaryDay * proposedPrimaPct) / 100)}
            </p>
            {request.notes && (
              <p className="text-xs text-muted-foreground italic">"{request.notes}"</p>
            )}
          </div>
        </div>

        {/* Salary section */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Salario del día</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="salary_type"
              value="registered"
              checked={salaryType === 'registered'}
              onChange={() => { setValue('salary_type', 'registered'); setValue('salary_pct', payload?.salary_pct ?? 100) }}
              className="accent-primary"
            />
            <span className="text-sm text-foreground flex-1">Salario registrado</span>
            <span className="text-sm font-medium">{formatCurrency(proposedSalaryDay)}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="salary_type"
              value="agreed"
              checked={salaryType === 'agreed'}
              onChange={() => setValue('salary_type', 'agreed')}
              className="accent-primary mt-0.5"
            />
            <div className="space-y-2 flex-1">
              <span className="text-sm text-foreground">Salario acordado</span>
              {salaryType === 'agreed' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="w-20"
                    {...register('salary_pct', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-medium">{formatCurrency(salaryDay)}</span>
                </div>
              )}
              {errors.salary_pct && (
                <p className="text-xs text-red-600">{errors.salary_pct.message}</p>
              )}
            </div>
          </label>
        </div>

        {/* Prima section */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Prima por día de descanso trabajado</p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="prima_type"
              value="legal"
              checked={primaType === 'legal'}
              onChange={() => { setValue('prima_type', 'legal'); setValue('prima_pct', 100) }}
              className="accent-primary"
            />
            <span className="text-sm text-foreground flex-1">Prima legal</span>
            <span className="text-sm font-medium">100% = {formatCurrency(salaryDay)}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="prima_type"
              value="agreed"
              checked={primaType === 'agreed'}
              onChange={() => setValue('prima_type', 'agreed')}
              className="accent-primary mt-0.5"
            />
            <div className="space-y-2 flex-1">
              <span className="text-sm text-foreground">Prima acordada</span>
              {primaType === 'agreed' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    step="1"
                    className="w-20"
                    {...register('prima_pct', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-medium">{formatCurrency(prima)}</span>
                </div>
              )}
              {errors.prima_pct && (
                <p className="text-xs text-red-600">{errors.prima_pct.message}</p>
              )}
            </div>
          </label>

          <p className="text-xs text-muted-foreground">0% mínimo · 200% máximo</p>
        </div>

        {/* Summary box */}
        <div className="rounded-md border border-border bg-muted/40 p-4 space-y-1.5">
          <p className="text-sm font-semibold text-foreground mb-2">Resumen del día</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Salario del día</span>
            <span>{formatCurrency(salaryDay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Séptimo día (1/6)</span>
            <span>{formatCurrency(seventhDay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prima ({effectivePrimaPct}%)</span>
            <span>{formatCurrency(prima)}</span>
          </div>
          <hr className="border-border my-1" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Nota para el empleado <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Textarea
            id="notes"
            placeholder="Ej: Acuerdo ajustado según disponibilidad"
            rows={2}
            {...register('notes')}
          />
        </div>

        {/* Actions */}
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
          <Button type="submit" disabled={isApproving || isRejecting}>
            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprobar acuerdo
          </Button>
        </div>
      </form>

      {/* Reject confirmation */}
      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={handleReject}
        title="Rechazar solicitud"
        description={
          <div className="space-y-3">
            <p>¿Confirmas que deseas rechazar la solicitud de {request.employee_name}?</p>
            <div className="space-y-1">
              <label htmlFor="reject_reason" className="text-xs font-medium text-foreground">
                Motivo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="reject_reason"
                placeholder="Ej: No procede por política interna"
                rows={2}
                value={rejectReason ?? ''}
                onChange={(e) => setValue('reject_reason', e.target.value)}
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

export function ReviewRequestDialog({ request, onClose }: ReviewRequestDialogProps) {
  return (
    <SlidePanel
      isOpen={!!request}
      onClose={onClose}
      title={request ? `Solicitud de ${request.employee_name}` : ''}
      size="sm"
    >
      {request && <InnerDialog request={request} onClose={onClose} />}
    </SlidePanel>
  )
}
