import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useDeactivateForm } from './use-deactivate-form'
import type { DeactivateFormValues } from './use-deactivate-form'

// Re-export type so consumers don't need to import from the hook file directly.
export type { DeactivateFormValues }

// ─── Props ───────────────────────────────────────────────────────────────────

interface DeactivateFormProps {
  isLoading: boolean
  onSubmit: (values: DeactivateFormValues) => void
  onCancel: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DeactivateForm({ isLoading, onSubmit, onCancel }: DeactivateFormProps) {
  const { form, today } = useDeactivateForm()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <h4 className="text-sm font-semibold">Dar de Baja</h4>
      <p className="text-xs text-muted-foreground">
        Al dar de baja se cierra el periodo de empleo actual y el empleado queda deshabilitado.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Fecha de baja */}
        <div className="space-y-1">
          <Label htmlFor="deactivate-end-date" className="block">Fecha de baja</Label>
          <input
            id="deactivate-end-date"
            type="date"
            max={today}
            {...register('end_date')}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          {errors.end_date && (
            <p className="text-xs text-red-600">{errors.end_date.message}</p>
          )}
        </div>

        {/* Motivo */}
        <div className="space-y-1">
          <Label htmlFor="deactivate-termination-reason" className="block">Motivo (opcional)</Label>
          <textarea
            id="deactivate-termination-reason"
            {...register('termination_reason')}
            placeholder="Renuncia voluntaria, despido, etc."
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            rows={2}
            maxLength={500}
          />
          {errors.termination_reason && (
            <p className="text-xs text-red-600">{errors.termination_reason.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="warning"
            size="sm"
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Confirmar Baja
          </Button>
        </div>
      </form>
    </div>
  )
}
