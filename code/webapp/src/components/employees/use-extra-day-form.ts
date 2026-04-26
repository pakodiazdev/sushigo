import { useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useWageHistory } from '@/services/employee-hooks'
import { useCreateEmployeeRequest } from '@/services/employee-request-hooks'
import { scheduleApi } from '@/services/schedule-api'

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
  const queryClient = useQueryClient()
  const { data: wages, isLoading: isLoadingWages } = useWageHistory(employeeId)

  const scheduleQuery = useQuery({
    queryKey: ['employees', employeeId, 'current-schedule'],
    queryFn: async () => {
      try {
        const res = await scheduleApi.getCurrent(employeeId)
        return res.data.data
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }
    },
    enabled: !!employeeId,
  })

  // ISO days of week (1=Mon…7=Sun) that are working days → disabled in the calendar
  const disabledDaysOfWeek = useMemo<number[]>(() => {
    if (!scheduleQuery.data?.days) return []
    return scheduleQuery.data.days
      .filter((d) => !d.is_day_off)
      .map((d) => d.day_of_week)
  }, [scheduleQuery.data])
  const currentWage = wages?.[0]

  // daily wage = hourly_rate × (weekly_scheduled_hours / 6 days)
  const registeredDailyWage = currentWage
    ? Number.parseFloat(currentWage.hourly_rate) * (currentWage.weekly_scheduled_hours / 6)
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

  const safeSalaryPct = Number.isNaN(salaryPct) ? 0 : salaryPct
  const salaryDay =
    salaryType === 'registered'
      ? registeredDailyWage
      : (safeSalaryPct / 100) * registeredDailyWage

  // seventh day = 1/6 of weekly wage = 1 daily wage (for 6-day schedule)
  const seventhDay = salaryDay
  const cleanPrimaPct = Number.isNaN(primaPct) ? 0 : primaPct
  const safePrimaPct = primaType === 'legal' ? 100 : cleanPrimaPct
  const prima = (safePrimaPct / 100) * salaryDay
  const total = salaryDay + seventhDay + prima

  const hasNoWage = !isLoadingWages && !currentWage

  const mutation = useCreateEmployeeRequest()

  const handleSubmit = form.handleSubmit(async (values) => {
    const effectiveSalaryPct = values.salary_type === 'registered' ? 100 : values.salary_pct
    const effectivePrimaPctValue = values.prima_type === 'legal' ? 100 : values.prima_pct

    try {
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

      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['negotiated-extra-days'] })
      onSuccess()
    } catch {
      // error handled by mutation.onError toast
    }
  })

  return {
    form,
    isLoadingWages,
    hasNoWage,
    registeredDailyWage,
    salaryDay,
    seventhDay,
    prima,
    total,
    handleSubmit,
    isPending: mutation.isPending,
    disabledDaysOfWeek,
    isLoadingSchedule: scheduleQuery.isLoading,
  }
}
