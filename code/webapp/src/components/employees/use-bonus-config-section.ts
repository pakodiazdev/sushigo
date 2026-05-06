import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useBonusGroups, useEmployeeBonusConfig, useAssignBonusConfig } from '@/services/punctuality-config-hooks'

const assignSchema = z.object({
  bonus_group_id: z.string().min(1, 'Selecciona un grupo'),
  effective_from: z.string().min(1, 'La fecha de vigencia es requerida'),
})

export type AssignFormValues = z.infer<typeof assignSchema>

export function useBonusConfigSection(employeeId: string) {
  const [showForm, setShowForm] = useState(false)

  const { data: configs, isLoading: isLoadingConfigs } = useEmployeeBonusConfig(employeeId)
  const { data: groups, isLoading: isLoadingGroups } = useBonusGroups()
  const assign = useAssignBonusConfig(employeeId)

  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { bonus_group_id: '', effective_from: '' },
  })

  const today = new Date().toISOString().slice(0, 10)
  const current =
    configs?.find(
      (c) => c.effective_from <= today && (c.effective_to === null || c.effective_to >= today),
    ) ?? null

  const onSubmit: SubmitHandler<AssignFormValues> = (values) => {
    assign.mutate(values, {
      onSuccess: () => {
        setShowForm(false)
        form.reset()
      },
    })
  }

  return {
    current,
    configs,
    groups,
    isLoadingConfigs,
    isLoadingGroups,
    showForm,
    setShowForm,
    form,
    onSubmit,
    isPending: assign.isPending,
  }
}
