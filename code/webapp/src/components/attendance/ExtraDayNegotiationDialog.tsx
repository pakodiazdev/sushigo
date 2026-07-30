import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLastFirst } from '@/lib/format'
import { useDialogTransition } from '@/components/ui/use-dialog-transition'
import {
  useExtraDayNegotiationDialog,
  formatCurrency,
} from './use-extra-day-negotiation-dialog'
import type { ExtraDayFormValues } from './use-extra-day-negotiation-dialog'
import type { TodayAttendanceEmployee } from '@/types/attendance'

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ExtraDayNegotiationDialogProps {
  isOpen: boolean
  employee: TodayAttendanceEmployee | null
  date: string
  registeredDailyWage: number | null
  isPending: boolean
  onConfirm: (payload: { agreed_daily_wage: number; prima_percent: number; notes: string }) => void
  onCancel: () => void
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Dialog for negotiating and approving an extra day for an employee on a scheduled rest day.
 * Manager sets the daily wage and prima bonus, then approves — which creates the
 * NegotiatedExtraDay record. After approval the time-picker dialog opens for the actual check-in.
 */
export function ExtraDayNegotiationDialog({
  isOpen,
  employee,
  date,
  registeredDailyWage,
  isPending,
  onConfirm,
  onCancel,
}: Readonly<ExtraDayNegotiationDialogProps>) {
  // The parent clears `employee`/`date`/`registeredDailyWage` the instant it
  // closes this dialog, so cache the last non-null content for the exit animation.
  const lastContent = useRef({ employee, date, registeredDailyWage })
  if (isOpen) lastContent.current = { employee, date, registeredDailyWage }
  const { employee: cEmployee, date: cDate, registeredDailyWage: cRegisteredDailyWage } = lastContent.current

  const {
    register,
    handleSubmit,
    errors,
    salaryMode,
    salaryAmountRaw,
    salaryPercentRaw,
    primaMode,
    primaPercentRaw,
    primaAmountRaw,
    effectiveSalary,
    effectivePrima,
    total,
    setSalaryMode,
    setPrimaMode,
    handleSalaryPercentChange,
    handleSalaryAmountChange,
    handlePrimaPercentChange,
    handlePrimaAmountChange,
    finalPrimaPercent,
  } = useExtraDayNegotiationDialog(cRegisteredDailyWage, isOpen)

  const { visible, backdropCls, panelCls } = useDialogTransition(isOpen, {
    onEscape: () => { if (!isPending) onCancel() },
    lockScroll: true,
  })

  if (!visible || !cEmployee) return null

  function onSubmit(formValues: ExtraDayFormValues) {
    onConfirm({
      agreed_daily_wage: effectiveSalary,
      prima_percent: finalPrimaPercent,
      notes: formValues.notes ?? '',
    })
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 ${backdropCls} cursor-default appearance-none border-none p-0`}
        onClick={() => { if (!isPending) onCancel() }}
        aria-label="Cerrar diálogo"
      />

      {/* Panel */}
      <dialog
        open
        aria-modal="true"
        aria-labelledby="extra-day-dialog-title"
        className={`relative z-10 bg-card rounded-xl border shadow-lg p-6 w-full max-w-md mx-4 space-y-4 overflow-y-auto max-h-[90vh] ${panelCls}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="extra-day-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              Día extra express
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">
                {formatLastFirst(cEmployee.user)}
              </span>
              {' · '}
              <span className="font-mono">{cDate}</span>
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { if (!isPending) onCancel() }}
            disabled={isPending}
            aria-label="Cancelar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Salary section */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Salario del día</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="salary_mode"
                value="registered"
                checked={salaryMode === 'registered'}
                onChange={() => setSalaryMode('registered')}
                disabled={isPending || cRegisteredDailyWage === null}
              />
              <span className="text-sm">
                Salario registrado{' '}
                <span className="text-muted-foreground">
                  {cRegisteredDailyWage === null
                    ? '(no configurado)'
                    : `(${formatCurrency(cRegisteredDailyWage)})`}
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="salary_mode"
                value="custom"
                checked={salaryMode === 'custom'}
                onChange={() => setSalaryMode('custom')}
                disabled={isPending}
              />
              <span className="text-sm">Salario negociado</span>
            </label>

            {salaryMode === 'custom' && (
              <div className="flex gap-2 ml-6">
                <div className="flex-1">
                  <label htmlFor="salary-percent-input" className="text-xs text-muted-foreground mb-1 block">% del salario</label>
                  <input
                    id="salary-percent-input"
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    value={salaryPercentRaw}
                    {...register('salary_percent', {
                      onChange: e => handleSalaryPercentChange(e.target.value),
                    })}
                    disabled={isPending || cRegisteredDailyWage === null}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="salary-amount-input" className="text-xs text-muted-foreground mb-1 block">Monto ($)</label>
                  <input
                    id="salary-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryAmountRaw}
                    {...register('salary_amount', {
                      onChange: e => handleSalaryAmountChange(e.target.value),
                    })}
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prima section */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Pago extra por trabajar en día de descanso</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="prima_mode"
                value="legal"
                checked={primaMode === 'legal'}
                onChange={() => setPrimaMode('legal')}
                disabled={isPending}
              />
              <span className="text-sm">
                Según ley{' '}
                <span className="text-muted-foreground">(100% adicional — {formatCurrency(effectiveSalary)})</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="prima_mode"
                value="custom"
                checked={primaMode === 'custom'}
                onChange={() => setPrimaMode('custom')}
                disabled={isPending}
              />
              <span className="text-sm">Negociada</span>
            </label>

            {primaMode === 'custom' && (
              <div className="flex gap-2 ml-6">
                <div className="flex-1">
                  <label htmlFor="prima-percent-input" className="text-xs text-muted-foreground mb-1 block">% de prima</label>
                  <input
                    id="prima-percent-input"
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    value={primaPercentRaw}
                    {...register('prima_percent', {
                      onChange: e => handlePrimaPercentChange(e.target.value),
                    })}
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="prima-amount-input" className="text-xs text-muted-foreground mb-1 block">Monto ($)</label>
                  <input
                    id="prima-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={primaAmountRaw}
                    {...register('prima_amount', {
                      onChange: e => handlePrimaAmountChange(e.target.value),
                    })}
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Totals summary */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Salario del día</span>
              <span className="font-mono font-medium">{formatCurrency(effectiveSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pago extra por trabajar en descanso</span>
              <span className="font-mono font-medium">{formatCurrency(effectivePrima)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
              <span className="font-semibold text-foreground">Total estimado</span>
              <span className="font-mono font-semibold text-foreground">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1" htmlFor="extra-day-notes">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="extra-day-notes"
              {...register('notes')}
              rows={2}
              placeholder="Motivo del día extra, acuerdos especiales…"
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {errors.notes && (
              <p className="text-xs text-red-600 mt-0.5">{errors.notes.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || effectiveSalary < 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isPending ? 'Registrando…' : 'Aprobar y continuar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
