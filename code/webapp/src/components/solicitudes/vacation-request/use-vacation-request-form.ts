import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useVacationEntitlements, useVacationBalancePreview } from '@/services/vacation-hooks'
import { useRequestVacation } from '@/services/employee-request-hooks'

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
  const mutation = useRequestVacation()

  const form = useForm<VacationRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dates: [],
      notes: null,
    },
  })

  const watchedDates = form.watch('dates')

  const { daysCount, remainingDays, isInsufficientBalance } = useVacationBalancePreview(
    watchedDates,
    entitlementsData?.entitlements
  )

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(
      {
        employee_id: employeeId,
        type: 'VACATION',
        auto_approve: false,
        notes: values.notes || undefined,
        payload: { dates: values.dates },
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
