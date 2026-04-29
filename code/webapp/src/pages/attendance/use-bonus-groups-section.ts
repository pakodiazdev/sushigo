import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useBonusGroups, useCreateBonusGroup } from '@/services/punctuality-config-hooks'

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50, 'Máximo 50 caracteres'),
  weekly_bonus_amount: z.number().positive('Debe ser mayor a 0'),
  working_days_divisor: z.number().int().min(1, 'Mínimo 1 día'),
})

export type BonusGroupFormValues = z.infer<typeof schema>

export function useBonusGroupsSection() {
  const [showForm, setShowForm] = useState(false)
  const { data: groups, isLoading } = useBonusGroups()
  const create = useCreateBonusGroup()

  const form = useForm<BonusGroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', weekly_bonus_amount: 0, working_days_divisor: 6 },
  })

  const onSubmit: SubmitHandler<BonusGroupFormValues> = (values) => {
    create.mutate(values, {
      onSuccess: () => {
        form.reset()
        setShowForm(false)
      },
    })
  }

  return {
    groups,
    isLoading,
    showForm,
    setShowForm,
    form,
    onSubmit,
    isPending: create.isPending,
  }
}
