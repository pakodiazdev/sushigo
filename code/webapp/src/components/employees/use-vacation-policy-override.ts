import { useEffect } from 'react'
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateEmployeeVacationPolicy } from '@/services/employee-vacation-policy-hooks'
import type { Employee } from '@/types/employee'

const tierSchema = z.object({
  years_from: z.number().int().min(1),
  days: z.number().int().min(0),
})

export const overrideSchema = z
  .object({
    enabled: z.boolean(),
    tiers: z.array(tierSchema),
  })
  .superRefine(({ enabled, tiers }, ctx) => {
    if (!enabled) return

    if (tiers.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['tiers'], message: 'Agrega al menos un tramo' })
      return
    }

    const seen = new Set<number>()
    tiers.forEach((tier, i) => {
      if (seen.has(tier.years_from)) {
        ctx.addIssue({ code: 'custom', path: ['tiers', i, 'years_from'], message: 'Debe ser único' })
      }
      seen.add(tier.years_from)
    })
  })

export type OverrideFormValues = z.infer<typeof overrideSchema>

const DEFAULT_TIER = { years_from: 1, days: 12 }

type OverrideEmployee = Pick<Employee, 'id' | 'vacation_entitlement_rule_key' | 'vacation_entitlement_custom_table'>

export function useVacationPolicyOverride(employee: OverrideEmployee) {
  const update = useUpdateEmployeeVacationPolicy(employee.id)

  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      enabled: employee.vacation_entitlement_rule_key === 'ContractualPolicy',
      tiers: employee.vacation_entitlement_custom_table && employee.vacation_entitlement_custom_table.length > 0
        ? employee.vacation_entitlement_custom_table
        : [DEFAULT_TIER],
    },
  })

  const { reset, watch } = form
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'tiers' })

  useEffect(() => {
    reset({
      enabled: employee.vacation_entitlement_rule_key === 'ContractualPolicy',
      tiers: employee.vacation_entitlement_custom_table && employee.vacation_entitlement_custom_table.length > 0
        ? employee.vacation_entitlement_custom_table
        : [DEFAULT_TIER],
    })
  }, [employee.id, employee.vacation_entitlement_rule_key, employee.vacation_entitlement_custom_table, reset])

  const enabled = watch('enabled')

  const onSubmit: SubmitHandler<OverrideFormValues> = (values) => {
    update.mutate({
      rule_key: values.enabled ? 'ContractualPolicy' : null,
      tiers: values.enabled ? values.tiers : undefined,
    })
  }

  const addRow = () => {
    const lastIndex = fields.length - 1
    const lastYearsFrom = form.getValues(`tiers.${lastIndex}.years_from`) ?? 0
    append({ years_from: lastYearsFrom + 1, days: 0 })
  }

  return {
    form,
    fields,
    remove,
    addRow,
    onSubmit,
    enabled,
    isPending: update.isPending,
  }
}
