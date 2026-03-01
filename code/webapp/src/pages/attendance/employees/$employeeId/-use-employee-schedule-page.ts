import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { employeeApi } from '@/services/employee-api'
import { scheduleApi } from '@/services/schedule-api'
import type { EmploymentPeriod } from '@/types/employment-period'

export function useEmployeeSchedulePage(employeeId: string) {
  const navigate = useNavigate()

  const employeeQuery = useQuery({
    queryKey: ['employees', employeeId],
    queryFn: async () => {
      const res = await employeeApi.get(employeeId)
      return res.data.data
    },
    enabled: !!employeeId,
  })

  const scheduleQuery = useQuery({
    queryKey: ['employees', employeeId, 'current-schedule'],
    queryFn: async () => {
      try {
        const res = await scheduleApi.getCurrent(employeeId)
        return { schedule: res.data.data, periodId: null as string | null }
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          const periodId = (err.response.data?.meta?.employment_period_id as string) ?? null
          return { schedule: null, periodId }
        }
        throw err
      }
    },
    enabled: !!employeeId,
  })

  const employee = employeeQuery.data
  const activePeriod: EmploymentPeriod | undefined = employee?.employment_periods?.find(
    (p) => p.is_active
  )

  // periodId to pass to the schedule form:
  // prefer the one from the 404 response (most precise), fall back to the active period from employee
  const periodIdForForm =
    scheduleQuery.data?.periodId ?? activePeriod?.id ?? null

  function goToCreateSchedule() {
    if (!periodIdForForm) return
    navigate({
      to: '/attendance/employees/$employeeId/schedules/new',
      params: { employeeId },
      search: { periodId: periodIdForForm },
    })
  }

  return {
    employee,
    activePeriod,
    schedule: scheduleQuery.data?.schedule ?? null,
    periodIdForForm,
    isLoadingEmployee: employeeQuery.isLoading,
    isLoadingSchedule: scheduleQuery.isLoading,
    isError: employeeQuery.isError,
    goToCreateSchedule,
  }
}
