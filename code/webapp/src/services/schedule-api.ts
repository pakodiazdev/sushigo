import { apiClient } from '@/lib/api-client'
import type { EmployeeSchedule, CreateScheduleFormValues } from '@/types/schedule'

interface EntityResponse<T> {
  data: T
  status: number
  meta: null
}

function toApiPayload(values: CreateScheduleFormValues) {
  return {
    name: values.name,
    effective_from: values.effective_from,
    workday_type: values.workday_type,
    working_days_per_week: Number(values.working_days_per_week),
    days: values.days.map((d) => ({
      day_of_week: d.day_of_week,
      is_day_off: d.is_day_off,
      expected_start: d.is_day_off ? null : (d.expected_start || null),
      expected_lunch_start: d.is_day_off ? null : (d.expected_lunch_start || null),
      expected_lunch_end: d.is_day_off ? null : (d.expected_lunch_end || null),
      lunch_duration_minutes:
        d.is_day_off || !d.lunch_duration_minutes
          ? null
          : Number(d.lunch_duration_minutes),
      expected_end: d.is_day_off ? null : (d.expected_end || null),
    })),
  }
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
}
