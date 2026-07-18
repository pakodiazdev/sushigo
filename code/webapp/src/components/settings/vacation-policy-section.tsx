import { Button } from '@/components/ui/button'
import {
  VacationPolicyTiersEditor,
  type VacationPolicyTiersFormValues,
} from '@/components/vacation-policy/vacation-policy-tiers-editor'
import type { FieldArrayWithId, FieldErrors, UseFormRegister } from 'react-hook-form'
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
            <input type="radio" value="VacationsLFTMX" {...register('active_rule_key')} />{' '}
            LFT México 2022
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="CustomCompanyPolicy" {...register('active_rule_key')} />{' '}
            Política personalizada
          </label>
        </div>

        {isCustom && (
          <VacationPolicyTiersEditor
            fields={fields as unknown as FieldArrayWithId<VacationPolicyTiersFormValues, 'tiers', 'id'>[]}
            register={register as unknown as UseFormRegister<VacationPolicyTiersFormValues>}
            errors={errors as unknown as FieldErrors<VacationPolicyTiersFormValues>}
            remove={remove}
            addRow={addRow}
          />
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
