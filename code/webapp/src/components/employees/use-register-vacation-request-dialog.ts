import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useVacationEntitlements, useCreateVacationRequest } from '@/services/vacation-hooks'

const schema = z.object({
  start_date: z.string().min(1, 'La fecha de inicio es requerida'),
  end_date: z.string().min(1, 'La fecha de fin es requerida'),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional().nullable(),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['end_date'],
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

function inclusiveDaysCount(start: string, end: string): number {
  if (!start || !end) return 0
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const diffMs = endDate.getTime() - startDate.getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return 0
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1
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
      start_date: '',
      end_date: '',
      notes: null,
    },
  })

  const watchedStartDate = form.watch('start_date')
  const watchedEndDate = form.watch('end_date')

  const daysCount = useMemo(
    () => inclusiveDaysCount(watchedStartDate, watchedEndDate),
    [watchedStartDate, watchedEndDate]
  )

  const remainingDays = useMemo(() => {
    if (!watchedStartDate || !entitlementsData?.entitlements) return null
    const year = new Date(`${watchedStartDate}T00:00:00`).getFullYear()
    const entitlement = entitlementsData.entitlements.find((e) => e.year === year)
    return entitlement ? entitlement.remaining_days : null
  }, [watchedStartDate, entitlementsData])

  const isInsufficientBalance = remainingDays !== null && daysCount > 0 && daysCount > remainingDays

  const handleSubmit = form.handleSubmit((values) => {
    if (!employee) return

    mutation.mutate(
      {
        employee_id: employee.id,
        start_date: values.start_date,
        end_date: values.end_date,
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
