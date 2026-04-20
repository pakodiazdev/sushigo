import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExtraDayNegotiationDialog } from './use-extra-day-negotiation-dialog'
import type { TodayAttendanceEmployee } from '@/types/attendance'

// ── Schema ─────────────────────────────────────────────────────────────────────

const extraDaySchema = z.object({
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type ExtraDayFormValues = z.infer<typeof extraDaySchema>

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ExtraDayNegotiationDialogProps {
  employee: TodayAttendanceEmployee
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
  employee,
  date,
  registeredDailyWage,
  isPending,
  onConfirm,
  onCancel,
}: Readonly<ExtraDayNegotiationDialogProps>) {
  const {
    salaryMode,
    salaryAmount,
    salaryPercent,
    primaMode,
    primaPercent,
    primaAmount,
    effectiveSalary,
    seventhDay,
    effectivePrima,
    total,
    setSalaryMode,
    setPrimaMode,
    setPrimaPercent,
    setPrimaAmount,
    handleSalaryPercentChange,
    handleSalaryAmountChange,
    handlePrimaPercentChange,
    handlePrimaAmountChange,
    formatCurrency,
    finalPrimaPercent,
  } = useExtraDayNegotiationDialog(registeredDailyWage)

  const { register, handleSubmit, formState: { errors } } = useForm<ExtraDayFormValues>({
    resolver: zodResolver(extraDaySchema),
    defaultValues: { notes: '' },
  })

  // Escape key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isPending, onCancel])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

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
        className="absolute inset-0 bg-black/50 cursor-default appearance-none border-none p-0"
        onClick={() => { if (!isPending) onCancel() }}
        aria-label="Cerrar diálogo"
      />

      {/* Panel */}
      <dialog
        open
        aria-modal="true"
        aria-labelledby="extra-day-dialog-title"
        className="relative z-10 bg-card rounded-xl border shadow-lg p-6 w-full max-w-md mx-4 space-y-4 overflow-y-auto max-h-[90vh]"
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
                {employee.last_name}, {employee.first_name}
              </span>
              {' · '}
              <span className="font-mono">{date}</span>
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
                disabled={isPending || registeredDailyWage === null}
              />
              <span className="text-sm">
                Salario registrado{' '}
                <span className="text-muted-foreground">
                  {registeredDailyWage !== null
                    ? `(${formatCurrency(registeredDailyWage)})`
                    : '(no configurado)'}
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
                  <label className="text-xs text-muted-foreground mb-1 block">% del salario</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    value={salaryPercent.toFixed(2)}
                    onChange={e => handleSalaryPercentChange(e.target.value)}
                    disabled={isPending || registeredDailyWage === null}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Monto ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryAmount.toFixed(2)}
                    onChange={e => handleSalaryAmountChange(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prima section */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Prima por descanso trabajado</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="prima_mode"
                value="legal"
                checked={primaMode === 'legal'}
                onChange={() => {
                  setPrimaMode('legal')
                  setPrimaPercent(100)
                  setPrimaAmount(effectiveSalary)
                }}
                disabled={isPending}
              />
              <span className="text-sm">
                Legal{' '}
                <span className="text-muted-foreground">(100% — {formatCurrency(effectiveSalary)})</span>
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
                  <label className="text-xs text-muted-foreground mb-1 block">% de prima</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    value={primaPercent.toFixed(2)}
                    onChange={e => handlePrimaPercentChange(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Monto ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={primaAmount.toFixed(2)}
                    onChange={e => handlePrimaAmountChange(e.target.value)}
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
              <span className="text-muted-foreground">7° día (1/6)</span>
              <span className="font-mono font-medium">{formatCurrency(seventhDay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prima por descanso trabajado</span>
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
