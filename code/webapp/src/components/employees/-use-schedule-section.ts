import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { scheduleApi } from '@/services/schedule-api'

export function useScheduleSection(employeeId: string) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

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
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  function goToCreateSchedule() {
    if (!periodId) return
    close()
    navigate({
      to: '/attendance/employees/$employeeId/schedules/new',
      params: { employeeId },
      search: { periodId },
    })
  }

  return {
    isOpen,
    open,
    close,
    schedule,
    periodId,
    isLoading: scheduleQuery.isLoading,
    isError: scheduleQuery.isError,
    goToCreateSchedule,
  }
}
