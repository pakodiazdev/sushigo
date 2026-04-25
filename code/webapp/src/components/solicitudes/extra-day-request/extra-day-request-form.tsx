import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { formatCurrency } from '@/lib/format'
import { useExtraDayRequestForm } from './use-extra-day-request-form'

interface ExtraDayRequestFormProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly employeeId: string
}

export function ExtraDayRequestForm({ isOpen, onClose, employeeId }: ExtraDayRequestFormProps) {
  const {
    form,
    isLoadingWages,
    hasNoWage,
    registeredDailyWage,
    prima,
    total,
    handleSubmit,
    isPending,
  } = useExtraDayRequestForm(employeeId, onClose)

  const { register, formState: { errors } } = form

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={handleClose} title="Solicitar día extra" size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <FormField label="Fecha" required error={errors.date?.message}>
          <Input type="date" {...register('date')} />
          <p className="text-xs text-muted-foreground mt-1">Solo se permiten fechas futuras</p>
        </FormField>

        {/* Prima proposal */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Mi propuesta de prima</p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              max="200"
              step="1"
              className="w-24"
              {...register('prima_pct', { valueAsNumber: true })}
            />
            <span className="text-sm text-muted-foreground">%</span>
            <span className="text-sm text-muted-foreground">=</span>
            {isLoadingWages ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-sm font-medium">{formatCurrency(prima)}</span>
            )}
          </div>
          {errors.prima_pct && (
            <p className="text-xs text-red-600">{errors.prima_pct.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Prima legal sugerida: 100% ·{' '}
            {!isLoadingWages && registeredDailyWage > 0 && (
              <>Salario base: {formatCurrency(registeredDailyWage)}</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Puedes proponer desde 0% — el Manager decide
          </p>
        </div>

        {/* Total estimate */}
        {!isLoadingWages && registeredDailyWage > 0 && (
          <div className="rounded-md border border-border bg-muted/40 p-4 space-y-1.5">
            <p className="text-sm font-semibold text-foreground mb-2">Estimado propuesto</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Salario del día</span>
              <span>{formatCurrency(registeredDailyWage)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Séptimo día (1/6)</span>
              <span>{formatCurrency(registeredDailyWage)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prima propuesta</span>
              <span>{formatCurrency(prima)}</span>
            </div>
            <hr className="border-border my-1" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total estimado</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              El Manager puede ajustar los montos al aprobar
            </p>
          </div>
        )}

        {/* Notes */}
        <FormField label="Nota para el Manager (opcional)" error={errors.notes?.message}>
          <Textarea
            placeholder='Ej: "No tengo planes ese día y me gustaría apoyar"'
            rows={3}
            {...register('notes')}
          />
        </FormField>

        {/* Warning */}
        <p className="text-sm text-muted-foreground border border-border rounded-md p-3 bg-muted/30">
          ⚠️ Esta solicitud requiere aprobación del Manager
        </p>

        {/* No wage warning */}
        {hasNoWage && (
          <p className="text-sm text-red-600">
            No tienes historial de salario registrado. Contacta a tu Manager.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending || isLoadingWages || hasNoWage}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </div>
      </form>
    </SlidePanel>
  )
}
