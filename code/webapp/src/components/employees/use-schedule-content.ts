import type { EmployeeSchedule, ScheduleDayOverride } from '@/types/schedule'
import { useCreateDayOverride } from './use-create-day-override'
import { useWeeklyCalendar } from './use-weekly-calendar'
import { calcDayHours } from './schedule-section-utils'

export function useScheduleContent(
  schedule: EmployeeSchedule,
  employeeId: string,
  periodId: string | null,
) {
  const override = useCreateDayOverride(employeeId, periodId)
  const { weekStart, prevWeek, nextWeek, jumpToDate, overrideListDow, openOverrideList, closeOverrideList } =
    useWeeklyCalendar()

  const overridesByDow = (schedule.active_overrides ?? []).reduce<Record<number, ScheduleDayOverride[]>>(
    (acc, o) => ({ ...acc, [o.day_of_week]: [...(acc[o.day_of_week] ?? []), o] }),
    {}
  )

  const sortedDays = [...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)

  // Use the browser's local date so that late-evening sessions in Mexico don't
  // accidentally roll over to UTC tomorrow when checking if an override is active.
  const todayLocal = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  // Returns the most-recently-started indefinite override for a day-of-week that
  // has already taken effect. Sorting DESC by effective_from ensures we get the
  // latest one when multiple permanent overrides exist for the same day.
  const findActivePermanentOverride = (dow: number): ScheduleDayOverride | null =>
    [...(overridesByDow[dow] ?? [])]
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
      .find((o) => o.effective_to === null && o.effective_from <= todayLocal) ?? null

  // Use effective times (permanent override when active, otherwise base schedule)
  // so the total matches the per-row hours shown in the config table.
  const totalWeeklyHours = sortedDays.reduce<number>((sum, day) => {
    const permanentOverride = findActivePermanentOverride(day.day_of_week)
    const effectiveDay = permanentOverride ?? day
    if (effectiveDay.is_day_off) return sum
    return sum + (calcDayHours(effectiveDay.expected_start, effectiveDay.expected_end, effectiveDay.lunch_duration_minutes) ?? 0)
  }, 0)

  // Expected hours: 8h/day × working days (only for FULL jornada)
  const expectedWeeklyHours = schedule.workday_type === 'FULL' ? schedule.working_days_per_week * 8 : null
  const pendingHours = expectedWeeklyHours === null ? null : Math.max(0, expectedWeeklyHours - totalWeeklyHours)

  const overridesForDow =
    overrideListDow === null
      ? []
      : (schedule.active_overrides ?? []).filter((o) => o.day_of_week === overrideListDow)

  const handleOverrideSelect = (o: ScheduleDayOverride, onJumpToWeekView?: () => void) => {
    closeOverrideList()
    jumpToDate(o.effective_from)
    onJumpToWeekView?.()
  }

  return {
    override,
    weekStart,
    prevWeek,
    nextWeek,
    overrideListDow,
    openOverrideList,
    closeOverrideList,
    overridesByDow,
    sortedDays,
    todayLocal,
    findActivePermanentOverride,
    totalWeeklyHours,
    expectedWeeklyHours,
    pendingHours,
    overridesForDow,
    handleOverrideSelect,
  }
}
