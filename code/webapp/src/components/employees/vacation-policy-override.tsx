import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  VacationPolicyTiersEditor,
  type VacationPolicyTiersFormValues,
} from '@/components/vacation-policy/vacation-policy-tiers-editor'
import type { Employee } from '@/types/employee'
import type { FieldArrayWithId, FieldErrors, UseFormRegister } from 'react-hook-form'
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
      <Label className="flex items-center gap-2">
        <input type="checkbox" {...register('enabled')} />{' '}
        Política contractual
      </Label>
      <p className="text-xs text-muted-foreground">
        Activa para otorgar a este empleado un derecho vacacional distinto al de la política de la
        empresa, tomando precedencia sobre ella.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {enabled && (
          <VacationPolicyTiersEditor
            fields={fields as unknown as FieldArrayWithId<VacationPolicyTiersFormValues, 'tiers', 'id'>[]}
            register={register as unknown as UseFormRegister<VacationPolicyTiersFormValues>}
            errors={errors as unknown as FieldErrors<VacationPolicyTiersFormValues>}
            remove={remove}
            addRow={addRow}
          />
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
