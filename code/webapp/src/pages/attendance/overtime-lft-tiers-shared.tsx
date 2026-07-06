import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOvertimeLftTiersConfigPage } from './use-overtime-lft-tiers-config-page'

interface HeadingProps {
  readonly titleAs?: 'h2' | 'h3'
}

interface OvertimeLftTiersFieldsProps extends HeadingProps {
  readonly tiers: ReturnType<typeof useOvertimeLftTiersConfigPage>['tiers']
  readonly form: ReturnType<typeof useOvertimeLftTiersConfigPage>['form']
  readonly fields: ReturnType<typeof useOvertimeLftTiersConfigPage>['fields']
  readonly remove: ReturnType<typeof useOvertimeLftTiersConfigPage>['remove']
  readonly onSubmit: ReturnType<typeof useOvertimeLftTiersConfigPage>['onSubmit']
  readonly addRow: ReturnType<typeof useOvertimeLftTiersConfigPage>['addRow']
  readonly isPending: boolean
}

export function OvertimeLftTiersFields({
  titleAs: Title = 'h2',
  form,
  fields,
  remove,
  onSubmit,
  addRow,
  isPending,
}: OvertimeLftTiersFieldsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form

  return (
    <>
      <div className="mb-6">
        <Title className="text-base font-semibold mb-1">Tramos LFT de Horas Extra</Title>
        <p className="text-sm text-muted-foreground">
          Define el factor aplicado según las horas extra acumuladas en la semana. El último tramo
          aplica sin tope a cualquier acumulado mayor.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-xl">
        <div className="grid grid-cols-[120px_1fr_40px] gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Factor</span>
          <span>Hasta (horas)</span>
          <span />
        </div>

        {fields.map((field, index) => {
          const isLast = index === fields.length - 1

          return (
            <div
              key={field.id}
              className="grid grid-cols-[120px_1fr_40px] gap-3 items-start rounded-lg border bg-card px-4 py-3"
            >
              <div>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register(`rows.${index}.factor`, { valueAsNumber: true })}
                />
                {errors.rows?.[index]?.factor && (
                  <p className="mt-1 text-xs text-red-600">{errors.rows[index]?.factor?.message}</p>
                )}
              </div>

              <div>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={isLast ? 'Sin tope' : undefined}
                  {...register(`rows.${index}.up_to_hours`)}
                />
                {errors.rows?.[index]?.up_to_hours && (
                  <p className="mt-1 text-xs text-red-600">{errors.rows[index]?.up_to_hours?.message}</p>
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
          )
        })}

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar tramo
          </Button>
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </>
  )
}
