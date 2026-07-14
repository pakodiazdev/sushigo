import { useEffect } from 'react'
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useVacationPolicy, useUpdateVacationPolicy } from '@/services/vacation-policy-hooks'

const tierSchema = z.object({
  years_from: z.number().int().min(1),
  days: z.number().int().min(0),
})

export const vacationPolicySchema = z
  .object({
    active_rule_key: z.enum(['VacationsLFTMX', 'CustomCompanyPolicy']),
    tiers: z.array(tierSchema),
  })
  .superRefine(({ active_rule_key, tiers }, ctx) => {
    if (active_rule_key !== 'CustomCompanyPolicy') return

    if (tiers.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['tiers'], message: 'Agrega al menos un tramo' })
      return
    }

    const seen = new Set<number>()
    tiers.forEach((tier, i) => {
      if (seen.has(tier.years_from)) {
        ctx.addIssue({
          code: 'custom',
          path: ['tiers', i, 'years_from'],
          message: 'Debe ser único',
        })
      }
      seen.add(tier.years_from)
    })
  })

export type VacationPolicyFormValues = z.infer<typeof vacationPolicySchema>

const DEFAULT_TIER = { years_from: 1, days: 12 }

export function useVacationPolicySection() {
  const { data: settings, isLoading } = useVacationPolicy()
  const update = useUpdateVacationPolicy()

  const form = useForm<VacationPolicyFormValues>({
    resolver: zodResolver(vacationPolicySchema),
    defaultValues: { active_rule_key: 'VacationsLFTMX', tiers: [DEFAULT_TIER] },
  })

  const { reset, watch } = form
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'tiers' })

  useEffect(() => {
    if (settings) {
      reset({
        active_rule_key: settings.active_rule_key,
        tiers: settings.tiers.length > 0
          ? settings.tiers.map((t) => ({ years_from: t.years_from, days: t.days }))
          : [DEFAULT_TIER],
      })
    }
  }, [settings, reset])

  const isCustom = watch('active_rule_key') === 'CustomCompanyPolicy'

  const onSubmit: SubmitHandler<VacationPolicyFormValues> = (values) => {
    update.mutate({
      active_rule_key: values.active_rule_key,
      tiers: values.active_rule_key === 'CustomCompanyPolicy' ? values.tiers : undefined,
    })
  }

  const addRow = () => {
    const lastIndex = fields.length - 1
    const lastYearsFrom = form.getValues(`tiers.${lastIndex}.years_from`) ?? 0
    append({ years_from: lastYearsFrom + 1, days: 0 })
  }

  return {
    settings,
    isLoading,
    form,
    fields,
    remove,
    addRow,
    onSubmit,
    isCustom,
    isPending: update.isPending,
  }
}
