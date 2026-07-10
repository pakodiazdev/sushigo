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

export type VacationRequestFormValues = z.infer<typeof schema>

export interface UseVacationRequestFormResult {
  form: UseFormReturn<VacationRequestFormValues>
  daysCount: number
  remainingDays: number | null
  isInsufficientBalance: boolean
  isPending: boolean
  handleSubmit: () => void
}

export function useVacationRequestForm(employeeId: string, onSuccess: () => void): UseVacationRequestFormResult {
  const { data: entitlementsData } = useVacationEntitlements(employeeId)
  const mutation = useCreateVacationRequest()

  const form = useForm<VacationRequestFormValues>({
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
    mutation.mutate(
      {
        employee_id: employeeId,
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

  return {
    form,
    daysCount,
    remainingDays,
    isInsufficientBalance,
    isPending: mutation.isPending,
    handleSubmit,
  }
}
