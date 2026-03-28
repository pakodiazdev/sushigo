import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { scheduleApi } from '@/services/schedule-api'

export type ScheduleDialogView = 'schedule' | 'create'

export function useScheduleSection(employeeId: string) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ScheduleDialogView>('schedule')
  const [isTransitioning, setIsTransitioning] = useState(false)

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
    // Fetch eagerly so the section knows whether a schedule exists before the
    // dialog is opened — this lets us show the correct button label ("Ver" vs
    // "Agregar") without waiting for the user to click first.
    enabled: !!employeeId,
  })

  const schedule = scheduleQuery.data?.schedule ?? null
  const periodId = scheduleQuery.data?.periodId ?? null

  const switchView = useCallback((target: ScheduleDialogView) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setView(target)
      setIsTransitioning(false)
    }, 150)
  }, [])

  function open() {
    setView('schedule')
    setIsOpen(true)
  }

  // Opens the dialog directly on the create form — used when no schedule exists yet.
  function openToCreate() {
    setView('create')
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setView('schedule')
  }

  function showCreate() { switchView('create') }
  function showSchedule() { switchView('schedule') }
  function onScheduleCreated() { switchView('schedule') }

  const hasSchedule = scheduleQuery.data !== undefined
    ? scheduleQuery.data.schedule !== null
    : undefined // undefined = still loading (unknown)

  return {
    isOpen,
    open,
    openToCreate,
    close,
    view,
    isTransitioning,
    showCreate,
    showSchedule,
    onScheduleCreated,
    schedule,
    periodId,
    hasSchedule,
    isLoading: scheduleQuery.isLoading,
    isError: scheduleQuery.isError,
  }
}
