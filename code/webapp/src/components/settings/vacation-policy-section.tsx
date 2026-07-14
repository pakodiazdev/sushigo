import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useVacationPolicySection } from './use-vacation-policy-section'

export function VacationPolicySection() {
  const { isLoading, form, fields, remove, addRow, onSubmit, isCustom, isPending } = useVacationPolicySection()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando configuración...</p>
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form

  return (
    <>
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-1">Reglas aplicables</h3>
        <p className="text-sm text-muted-foreground">
          La LFT México 2022 aplica como mínimo legal sin necesidad de configuración. Una política
          personalizada permite otorgar más días de los que exige la ley.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="VacationsLFTMX" {...register('active_rule_key')} />
            LFT México 2022
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="CustomCompanyPolicy" {...register('active_rule_key')} />
            Política personalizada
          </label>
        </div>

        {isCustom && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Desde año</span>
              <span>Días</span>
              <span />
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_40px] gap-3 items-start rounded-lg border bg-card px-4 py-3"
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

        <div className="pt-2">
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </>
  )
}
