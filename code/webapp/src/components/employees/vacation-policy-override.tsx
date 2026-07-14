import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Employee } from '@/types/employee'
import { useVacationPolicyOverride } from './use-vacation-policy-override'

interface VacationPolicyOverrideProps {
  readonly employee: Pick<Employee, 'id' | 'vacation_entitlement_rule_key' | 'vacation_entitlement_custom_table'>
}

export function VacationPolicyOverride({ employee }: VacationPolicyOverrideProps) {
  const { form, fields, remove, addRow, onSubmit, enabled, isPending } = useVacationPolicyOverride(employee)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...register('enabled')} />
        Política contractual
      </label>
      <p className="text-xs text-muted-foreground">
        Activa para otorgar a este empleado un derecho vacacional distinto al de la política de la
        empresa, tomando precedencia sobre ella.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {enabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Desde año</span>
              <span>Días</span>
              <span />
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_40px] gap-3 items-start rounded-lg border bg-card px-3 py-2"
              >
                <div>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`tiers.${index}.years_from`, { valueAsNumber: true })}
                  />
                  {errors.tiers?.[index]?.years_from && (
                    <p className="mt-1 text-xs text-red-600">{errors.tiers[index]?.years_from?.message}</p>
                  )}
                </div>

                <div>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    {...register(`tiers.${index}.days`, { valueAsNumber: true })}
                  />
                  {errors.tiers?.[index]?.days && (
                    <p className="mt-1 text-xs text-red-600">{errors.tiers[index]?.days?.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-center h-9">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label="Eliminar tramo"
                    title="Eliminar tramo"
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar tramo
            </Button>
          </div>
        )}

        <div>
          <Button type="submit" size="sm" disabled={!isDirty || isPending}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
