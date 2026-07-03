import { useState } from 'react'
import { useWeeklySummary } from '@/services/report.service'
import { useEmployee } from '@/services/employee-hooks'
import { currentWeekRange, weekRangeContaining, addDays } from '@/lib/week'
import type { WeeklySummaryResponse } from '@/types/report'

export interface WeeklySummaryDialogState {
  isOpen: boolean
  employeeName: string
  employeePublicId: string
  periodStart: string
  periodEnd: string
  prevWeek: () => void
  nextWeek: () => void
  jumpToDate: (dateStr: string) => void
  isCurrentWeek: boolean
  isEarliestWeek: boolean
  earliestWeekStart: string | null
  goToCurrentWeek: () => void
  summary: WeeklySummaryResponse | null
  isLoading: boolean
  isError: boolean
  /** `name` is optional — used for an instant title before the employee record loads (e.g. from an already-fetched row). Omit when only the id is known (e.g. restoring from a URL). */
  open: (publicId: string, name?: string) => void
  close: () => void
}

export function useWeeklySummaryDialog(): WeeklySummaryDialogState {
  const [isOpen, setIsOpen] = useState(false)
  const [employeePublicId, setEmployeePublicId] = useState('')
  const [fallbackName, setFallbackName] = useState('')
  const { start, end } = currentWeekRange()
  const [periodStart, setPeriodStart] = useState(start)
  const [periodEnd, setPeriodEnd] = useState(end)

  const shouldQuery = isOpen && !!employeePublicId && !!periodStart && !!periodEnd
  const { data, isLoading, isError } = useWeeklySummary(
    shouldQuery ? employeePublicId : null,
    shouldQuery ? periodStart : null,
    shouldQuery ? periodEnd : null,
  )

  const { data: employee } = useEmployee(employeePublicId)
  const employeeName = employee ? `${employee.last_name}, ${employee.first_name}` : fallbackName
  const periods = employee?.employment_periods ?? []
  const hireDate = periods.length > 0
    ? periods.reduce((earliest, p) => (p.start_date < earliest ? p.start_date : earliest), periods[0]!.start_date) // NOSONAR — start_date is an ISO date string, not a number; Math.min() would coerce it to NaN
    : null
  const earliestWeekStart = hireDate ? weekRangeContaining(hireDate).start : null

  function open(publicId: string, name?: string) {
    setEmployeePublicId(publicId)
    setFallbackName(name ?? '')
    const { start: s, end: e } = currentWeekRange()
    setPeriodStart(s)
    setPeriodEnd(e)
    setIsOpen(true)
  }

  function shiftWeek(days: number) {
    setPeriodStart((prev) => addDays(prev, days))
    setPeriodEnd((prev) => addDays(prev, days))
  }

  function jumpToDate(dateStr: string) {
    const { start: s, end: e } = weekRangeContaining(dateStr)
    if (s > currentWeekRange().start) return // future weeks are not selectable
    if (earliestWeekStart !== null && s < earliestWeekStart) return // before the employee's hire date
    setPeriodStart(s)
    setPeriodEnd(e)
  }

  function goToCurrentWeek() {
    const { start: s, end: e } = currentWeekRange()
    setPeriodStart(s)
    setPeriodEnd(e)
  }

  const isCurrentWeek = periodStart === currentWeekRange().start
  const isEarliestWeek = earliestWeekStart !== null && periodStart === earliestWeekStart

  return {
    isOpen,
    employeeName,
    employeePublicId,
    periodStart,
    periodEnd,
    prevWeek: () => { if (!isEarliestWeek) shiftWeek(-7) },
    nextWeek: () => { if (!isCurrentWeek) shiftWeek(7) },
    jumpToDate,
    isCurrentWeek,
    isEarliestWeek,
    earliestWeekStart,
    goToCurrentWeek,
    summary: data ?? null,
    isLoading,
    isError,
    open,
    close: () => setIsOpen(false),
  }
}
