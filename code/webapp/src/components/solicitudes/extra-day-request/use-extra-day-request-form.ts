import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useWageHistory } from '@/services/employee-hooks'
import { useRequestExtraDay } from '@/services/employee-request-hooks'

const today = new Date().toISOString().split('T')[0]!

const extraDayRequestSchema = z.object({
  date: z
    .string()
    .min(1, 'La fecha es requerida')
    .refine((d) => d > today, 'Solo se permiten fechas futuras'),
  prima_pct: z.number().min(0, 'Mínimo 0%').max(200, 'Máximo 200%'),
  notes: z.string().max(1000).optional(),
})

export type ExtraDayRequestFormValues = z.infer<typeof extraDayRequestSchema>

export function useExtraDayRequestForm(employeeId: string, onSuccess: () => void) {
  const { data: wages, isLoading: isLoadingWages } = useWageHistory(employeeId)
  const currentWage = wages?.[0]

  const registeredDailyWage = currentWage
    ? Number.parseFloat(currentWage.hourly_rate) * (currentWage.weekly_scheduled_hours / 6)
    : 0

  const form = useForm<ExtraDayRequestFormValues>({
    resolver: zodResolver(extraDayRequestSchema),
    defaultValues: {
      date: '',
      prima_pct: 100,
      notes: '',
    },
  })

  const primaPct = form.watch('prima_pct')
  const cleanPrimaPct = Number.isNaN(primaPct) ? 0 : primaPct

  const salaryDay = registeredDailyWage
  const seventhDay = salaryDay
  const prima = (cleanPrimaPct / 100) * salaryDay
  const total = salaryDay + seventhDay + prima

  const mutation = useRequestExtraDay()

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        employee_id: employeeId,
        type: 'EXTRA_DAY',
        auto_approve: false,
        notes: values.notes || undefined,
        payload: {
          date: values.date,
          salary_pct: 100,
          prima_pct: values.prima_pct,
          salary_day: salaryDay,
          prima,
          seventh_day: seventhDay,
          total,
        },
      })

      form.reset()
      onSuccess()
    } catch {
      // error handled by mutation.onError toast
    }
  })

  return {
    form,
    isLoadingWages,
    hasNoWage: !isLoadingWages && !currentWage,
    registeredDailyWage,
    prima,
    total,
    handleSubmit,
    isPending: mutation.isPending,
  }
}
