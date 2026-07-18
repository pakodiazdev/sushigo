import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { FieldArrayWithId, FieldErrors, UseFormRegister } from 'react-hook-form'

export interface VacationPolicyTierValue {
  years_from: number
  days: number
}

export interface VacationPolicyTiersFormValues {
  tiers: VacationPolicyTierValue[]
}

interface VacationPolicyTiersEditorProps {
  readonly fields: FieldArrayWithId<VacationPolicyTiersFormValues, 'tiers', 'id'>[]
  readonly register: UseFormRegister<VacationPolicyTiersFormValues>
  readonly errors: FieldErrors<VacationPolicyTiersFormValues>
  readonly remove: (index: number) => void
  readonly addRow: () => void
}

export function VacationPolicyTiersEditor({ fields, register, errors, remove, addRow }: VacationPolicyTiersEditorProps) {
  return (
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
  )
}
