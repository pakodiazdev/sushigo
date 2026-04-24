import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useWageHistory } from '@/services/employee-hooks'
import { useCreateEmployeeRequest } from '@/services/employee-request-hooks'

const extraDaySchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  salary_type: z.enum(['registered', 'custom']),
  salary_pct: z.number().min(0, 'Mínimo 0%').max(200, 'Máximo 200%'),
  prima_type: z.enum(['legal', 'custom']),
  prima_pct: z.number().min(0, 'Mínimo 0%').max(200, 'Máximo 200%'),
  notes: z.string().max(1000).optional(),
})

export type ExtraDayFormValues = z.infer<typeof extraDaySchema>

export function useExtraDayForm(employeeId: string, onSuccess: () => void) {
  const { data: wages, isLoading: isLoadingWages } = useWageHistory(employeeId)
  const currentWage = wages?.[0]

  // daily wage = hourly_rate × (weekly_scheduled_hours / 6 days)
  const registeredDailyWage = currentWage
    ? parseFloat(currentWage.hourly_rate) * (currentWage.weekly_scheduled_hours / 6)
    : 0

  const form = useForm<ExtraDayFormValues>({
    resolver: zodResolver(extraDaySchema),
    defaultValues: {
      date: '',
      salary_type: 'registered',
      salary_pct: 100,
      prima_type: 'legal',
      prima_pct: 100,
      notes: '',
    },
  })

  const salaryType = form.watch('salary_type')
  const salaryPct = form.watch('salary_pct')
  const primaType = form.watch('prima_type')
  const primaPct = form.watch('prima_pct')

  const salaryDay =
    salaryType === 'registered'
      ? registeredDailyWage
      : (salaryPct / 100) * registeredDailyWage

  // seventh day = 1/6 of weekly wage = 1 daily wage (for 6-day schedule)
  const seventhDay = salaryDay
  const effectivePrimaPct = primaType === 'legal' ? 100 : primaPct
  const prima = (effectivePrimaPct / 100) * salaryDay
  const total = salaryDay + seventhDay + prima

  const mutation = useCreateEmployeeRequest()

  const handleSubmit = form.handleSubmit(async (values) => {
    const effectiveSalaryPct = values.salary_type === 'registered' ? 100 : values.salary_pct
    const effectivePrimaPctValue = values.prima_type === 'legal' ? 100 : values.prima_pct

    await mutation.mutateAsync({
      employee_id: employeeId,
      type: 'EXTRA_DAY',
      auto_approve: true,
      notes: values.notes || undefined,
      payload: {
        date: values.date,
        salary_pct: effectiveSalaryPct,
        prima_pct: effectivePrimaPctValue,
        salary_day: salaryDay,
        prima,
        seventh_day: seventhDay,
        total,
      },
    })

    onSuccess()
  })

  return {
    form,
    isLoadingWages,
    registeredDailyWage,
    salaryDay,
    seventhDay,
    prima,
    total,
    handleSubmit,
    isPending: mutation.isPending,
  }
}
