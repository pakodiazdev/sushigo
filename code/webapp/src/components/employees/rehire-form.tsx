import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useRehireForm } from './use-rehire-form'
import type { RehireFormValues } from './use-rehire-form'

// Re-export type so consumers don't need to import from the hook file directly.
export type { RehireFormValues }

// ─── Props ───────────────────────────────────────────────────────────────────

interface RehireFormProps {
  isLoading: boolean
  onSubmit: (values: RehireFormValues) => void
  onCancel: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * RehireForm no longer accepts `effectiveBranch` as a prop — the hook resolves
 * it internally from the auth store, following the same pattern as
 * `useEmployeeDetailActions`.
 */
export function RehireForm({ isLoading, onSubmit, onCancel }: RehireFormProps) {
  const { form, today, effectiveBranch } = useRehireForm()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
      <h4 className="text-sm font-semibold">Reingreso</h4>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Fecha de reingreso */}
        <div className="space-y-1">
          <Label className="block">Fecha de reingreso</Label>
          <input
            type="date"
            max={today}
            {...register('start_date')}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          {errors.start_date && (
            <p className="text-xs text-red-600">{errors.start_date.message}</p>
          )}
        </div>

        {/* Sucursal info */}
        {effectiveBranch ? (
          <p className="text-xs text-muted-foreground">
            Sucursal asignada automáticamente:{' '}
            <span className="font-medium text-foreground">{effectiveBranch.name}</span>
          </p>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No hay sucursal disponible. Contacta a un administrador para realizar el reingreso.
          </p>
        )}

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
            variant="success"
            size="sm"
            disabled={isLoading || !effectiveBranch}
            className="text-xs"
          >
            {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Confirmar Reingreso
          </Button>
        </div>
      </form>
    </div>
  )
}
