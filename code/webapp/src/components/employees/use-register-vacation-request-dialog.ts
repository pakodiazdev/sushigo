import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useVacationEntitlements, useCreateVacationRequest } from '@/services/vacation-hooks'

const schema = z.object({
  dates: z.array(z.string()).min(1, 'Selecciona al menos un día'),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional().nullable(),
})

export type RegisterVacationRequestFormValues = z.infer<typeof schema>

export interface RegisterVacationRequestEmployee {
  id: string
  first_name: string
  last_name: string
}

export interface UseRegisterVacationRequestDialogProps {
  employee: RegisterVacationRequestEmployee | null
  onSuccess: () => void
}

export interface UseRegisterVacationRequestDialogResult {
  form: UseFormReturn<RegisterVacationRequestFormValues>
  daysCount: number
  remainingDays: number | null
  isInsufficientBalance: boolean
  isPending: boolean
  handleSubmit: () => void
  handleClose: () => void
}

export function useRegisterVacationRequestDialog({
  employee,
  onSuccess,
}: UseRegisterVacationRequestDialogProps): UseRegisterVacationRequestDialogResult {
  const { data: entitlementsData } = useVacationEntitlements(employee?.id ?? '')
  const mutation = useCreateVacationRequest()

  const form = useForm<RegisterVacationRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dates: [],
      notes: null,
    },
  })

  const watchedDates = form.watch('dates')

  const daysCount = watchedDates.length

  const remainingDays = useMemo(() => {
    if (watchedDates.length === 0 || !entitlementsData?.entitlements) return null
    const firstDate = [...watchedDates].sort((a, b) => a.localeCompare(b))[0]
    const year = new Date(`${firstDate}T00:00:00`).getFullYear()
    const entitlement = entitlementsData.entitlements.find((e) => e.year === year)
    return entitlement ? entitlement.remaining_days : null
  }, [watchedDates, entitlementsData])

  const isInsufficientBalance = remainingDays !== null && daysCount > 0 && daysCount > remainingDays

  const handleSubmit = form.handleSubmit((values) => {
    if (!employee) return

    mutation.mutate(
      {
        employee_id: employee.id,
        dates: values.dates,
        notes: values.notes || null,
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess()
        },
      }
    )
  })

  const handleClose = () => {
    form.reset()
  }

  return {
    form,
    daysCount,
    remainingDays,
    isInsufficientBalance,
    isPending: mutation.isPending,
    handleSubmit,
    handleClose,
  }
}
