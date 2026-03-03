import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { scheduleApi } from '@/services/schedule-api'

export type ScheduleDialogView = 'schedule' | 'create'

export function useScheduleSection(employeeId: string) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ScheduleDialogView>('schedule')

  const scheduleQuery = useQuery({
    queryKey: ['employees', employeeId, 'current-schedule'],
    queryFn: async () => {
      try {
        const res = await scheduleApi.getCurrent(employeeId)
        const schedule = res.data.data
        return { schedule, periodId: schedule.employment_period_id }
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          return {
            schedule: null,
            periodId: (err.response.data?.meta?.employment_period_id ?? null) as string | null,
          }
        }
        throw err
      }
    },
    enabled: isOpen,
  })

  const schedule = scheduleQuery.data?.schedule ?? null
  const periodId = scheduleQuery.data?.periodId ?? null

  function open() {
    setView('schedule')
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setView('schedule')
  }

  function showCreate() {
    setView('create')
  }

  function showSchedule() {
    setView('schedule')
  }

  function onScheduleCreated() {
    setView('schedule')
  }

  return {
    isOpen,
    open,
    close,
    view,
    showCreate,
    showSchedule,
    onScheduleCreated,
    schedule,
    periodId,
    isLoading: scheduleQuery.isLoading,
    isError: scheduleQuery.isError,
  }
}
