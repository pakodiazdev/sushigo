import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOvertimeDecisionDialog } from './use-overtime-decision-dialog'
import type { OvertimeValuationMethod, OvertimeValuationPreview } from '@/types/attendance'

export interface OvertimeDecisionDialogProps {
  isOpen: boolean
  attendanceId: string | null
  employeeName: string
  overtimeMinutes: number
  isLoading: boolean
  onAuthorize: (method: OvertimeValuationMethod, agreedRate?: number, agreedFactor?: number) => void
  onReject: () => void
  onClose: () => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

function renderOvertimePreview(
  isPreviewLoading: boolean,
  previewError: string | null,
  preview: OvertimeValuationPreview | undefined,
): ReactNode {
  if (isPreviewLoading) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Calculando...
      </span>
    )
  }

  if (previewError) {
    return <span className="text-destructive">{previewError}</span>
  }

  if (preview) {
    return (
      <span className="text-foreground">
        Monto estimado:{' '}
        <span className="font-semibold">{formatCurrency(preview.amount)}</span>
      </span>
    )
  }

  return <span className="text-muted-foreground">Completa los datos para ver el monto estimado.</span>
}

/**
 * Confirmation dialog for overtime payment decision.
 * Step 1: "Pagar" / "No pagar" / "Cancelar".
 * Step 2 (only when paying): choose the valuation method — LFT proportional
 * (factor resolved automatically from the configured tiers), a flat agreed
 * rate, or a custom factor over the employee's own salary — with a live
 * preview of the resulting amount.
 * Supports Escape-to-close and locks background scroll while open.
 */
export function OvertimeDecisionDialog({
  isOpen,
  attendanceId,
  employeeName,
  overtimeMinutes,
  isLoading,
  onAuthorize,
  onReject,
  onClose,
}: Readonly<OvertimeDecisionDialogProps>) {
  const { step, form, handlePagar, handleBack, onSubmitMethod, preview, isPreviewLoading, previewError } =
    useOvertimeDecisionDialog({ isOpen, attendanceId, onAuthorize })
  const { register, handleSubmit, watch, formState: { errors } } = form
  const selectedMethod = watch('valuation_method')

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
        {step === 'confirm' ? (
          <>
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
                onClick={handlePagar}
                disabled={isLoading}
                data-testid="btn-authorize-overtime"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Pagar horas extra
              </Button>

              <Button
                variant="outline-danger"
                className="w-full"
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
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmitMethod)} className="space-y-4">
            <div className="space-y-1">
              <h2 id="overtime-dialog-title" className="text-lg font-semibold text-foreground">
                Método de valoración
              </h2>
              <p className="text-sm text-muted-foreground">
                ¿Cómo se pagarán los{' '}
                <span className="font-semibold text-foreground">{overtimeMinutes} min extra</span>
                {' '}de {employeeName}?
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="valuation_method" className="text-sm font-medium">Método</label>
              <select
                id="valuation_method"
                {...register('valuation_method')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              >
                <option value="LFT_PROPORTIONAL">Proporcional LFT (automático por tramos)</option>
                <option value="AGREED_RATE">Tarifa fija pactada</option>
                <option value="SALARY_FACTOR">Factor sobre salario</option>
              </select>
            </div>

            {selectedMethod === 'AGREED_RATE' && (
              <div className="space-y-1">
                <label htmlFor="agreed_rate" className="text-sm font-medium">Tarifa por hora</label>
                <input
                  id="agreed_rate"
                  type="number"
                  step="0.01"
                  {...register('agreed_rate')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isLoading}
                />
                {errors.agreed_rate && (
                  <p className="text-xs text-destructive">{errors.agreed_rate.message}</p>
                )}
              </div>
            )}

            {selectedMethod === 'SALARY_FACTOR' && (
              <div className="space-y-1">
                <label htmlFor="agreed_factor" className="text-sm font-medium">Factor (ej. 1.5 = 1.5x su salario)</label>
                <input
                  id="agreed_factor"
                  type="number"
                  step="0.01"
                  {...register('agreed_factor')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isLoading}
                />
                {errors.agreed_factor && (
                  <p className="text-xs text-destructive">{errors.agreed_factor.message}</p>
                )}
              </div>
            )}

            {/* Live cost preview */}
            <div
              className={
                previewError
                  ? 'rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm'
                  : 'rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'
              }
              data-testid="overtime-preview"
            >
              {renderOvertimePreview(isPreviewLoading, previewError, preview)}
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="btn-confirm-valuation">
                Confirmar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Regresar
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  )

  return createPortal(content, document.body)
}
