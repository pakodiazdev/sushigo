import { apiClient } from '@/lib/api-client'
import type { EmployeeSchedule, ScheduleDayOverride, CreateScheduleFormValues } from '@/types/schedule'
import type { EntityResponse } from '@/types/employee'

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function toApiPayload(values: CreateScheduleFormValues) {
  return {
    effective_from: values.effective_from,
    workday_type: values.workday_type,
    working_days_per_week: Number(values.working_days_per_week),
    days: values.days.map((d) => {
      const lunchStart = d.is_day_off ? null : (d.expected_lunch_start || null)
      const lunchDuration = d.is_day_off || !d.lunch_duration_minutes ? null : Number(d.lunch_duration_minutes)
      const lunchEnd = lunchStart && lunchDuration ? addMinutesToTime(lunchStart, lunchDuration) : null
      return {
        day_of_week: d.day_of_week,
        is_day_off: d.is_day_off,
        expected_start: d.is_day_off ? null : (d.expected_start || null),
        expected_lunch_start: lunchStart,
        expected_lunch_end: lunchEnd,
        lunch_duration_minutes: lunchDuration,
        expected_end: d.is_day_off ? null : (d.expected_end || null),
      }
    }),
  }
}

export interface CreateSchedulePayload {
  effective_from: string
  workday_type: string
  working_days_per_week: number
  days: Array<{
    day_of_week: number
    is_day_off: boolean
    expected_start: string | null
    expected_lunch_start: string | null
    expected_lunch_end: string | null
    lunch_duration_minutes: number | null
    expected_end: string | null
  }>
}

export interface CreateDayOverridePayload {
  day_of_week: number
  effective_from: string
  effective_to: string | null
  is_day_off: boolean
  expected_start: string | null
  expected_lunch_start: string | null
  expected_lunch_end: string | null
  lunch_duration_minutes: number | null
  expected_end: string | null
  note: string | null
}

export const scheduleApi = {
  create: (periodId: string, values: CreateScheduleFormValues) =>
    apiClient.post<EntityResponse<EmployeeSchedule>>(
      `/employment-periods/${periodId}/schedules`,
      toApiPayload(values)
    ),

  getCurrent: (employeeId: string) =>
    apiClient.get<EntityResponse<EmployeeSchedule>>(
      `/employees/${employeeId}/current-schedule`
    ),

  createPayload: (periodId: string, payload: CreateSchedulePayload) =>
    apiClient.post<EntityResponse<EmployeeSchedule>>(
      `/employment-periods/${periodId}/schedules`,
      payload
    ),

  createDayOverride: (periodId: string, payload: CreateDayOverridePayload) =>
    apiClient.post<EntityResponse<ScheduleDayOverride>>(
      `/employment-periods/${periodId}/schedule-day-overrides`,
      payload
    ),
}
