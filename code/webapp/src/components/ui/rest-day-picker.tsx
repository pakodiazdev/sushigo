import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { isAxiosError } from 'axios'
import { CalendarPicker } from '@/components/ui/calendar-picker'
import { scheduleApi } from '@/services/schedule-api'
import type { EmployeeSchedule } from '@/types/schedule'

interface RestDayPickerProps {
  /** ULID of the employee whose working days should be disabled */
  readonly employeeId: string
  /** Selected date in YYYY-MM-DD format, or empty string */
  readonly value: string
  readonly onChange: (date: string) => void
  readonly placeholder?: string
  readonly className?: string
}

/**
 * A CalendarPicker that automatically fetches the employee's current schedule
 * and disables working days — leaving only rest days selectable.
 *
 * Usage:
 * ```tsx
 * <RestDayPicker
 *   employeeId={employee.id}
 *   value={watch('date')}
 *   onChange={(date) => setValue('date', date, { shouldValidate: true })}
 *   placeholder="Seleccionar día de descanso"
 * />
 * ```
 */
export function RestDayPicker({ employeeId, value, onChange, placeholder, className }: RestDayPickerProps) {
  const scheduleQuery = useQuery({
    queryKey: ['employees', employeeId, 'current-schedule'],
    queryFn: async () => {
      try {
        const res = await scheduleApi.getCurrent(employeeId)
        return res.data.data as EmployeeSchedule
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }
    },
    enabled: !!employeeId,
  })

  const disabledDaysOfWeek = useMemo<number[]>(() => {
    if (!scheduleQuery.data?.days) return []
    return scheduleQuery.data.days
      .filter((d) => !d.is_day_off)
      .map((d) => d.day_of_week)
  }, [scheduleQuery.data])

  if (scheduleQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando horario…
      </div>
    )
  }

  return (
    <CalendarPicker
      value={value}
      onChange={onChange}
      disabledDaysOfWeek={disabledDaysOfWeek}
      placeholder={placeholder}
      className={className}
    />
  )
}
