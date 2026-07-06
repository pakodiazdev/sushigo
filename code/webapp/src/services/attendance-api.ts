import { apiClient } from '@/lib/api-client'
import type { TodayAttendanceResponse, AttendanceRecord, CloseDayRequest, CloseDayResponse, OvertimeValuationMethod, OvertimeValuationPreview } from '@/types/attendance'

export const attendanceApi = {
  /**
   * GET /attendances/today?branch_id=<id>&date=<YYYY-MM-DD>
   * Returns all active employees for the branch with their attendance for the given date
   * (defaults to today when date is omitted).
   */
  daily: (branchId: number, date?: string) =>
    apiClient.get<TodayAttendanceResponse>('/attendances/today', {
      params: { branch_id: branchId, ...(date ? { date } : {}) },
    }),

  /**
   * POST /attendances/check-in
   * Body: { employee_id: ULID, check_in: "YYYY-MM-DDTHH:mm:ss±offset", reason?: string }
   */
  checkIn: (data: { employee_id: string; check_in: string; reason?: string }) =>
    apiClient.post<{ status: number; data: AttendanceRecord }>('/attendances/check-in', data),

  /**
   * PATCH /attendances/{id}/lunch-start
   * Body: { lunch_start: "YYYY-MM-DDTHH:mm:ss+offset", reason?: string }
   */
  lunchStart: (attendanceId: string, data: { lunch_start: string; reason?: string }) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/lunch-start`,
      data,
    ),

  /**
   * PATCH /attendances/{id}/lunch-return
   * Body: { lunch_end: "YYYY-MM-DDTHH:mm:ss+offset", reason?: string }
   */
  lunchReturn: (attendanceId: string, data: { lunch_end: string; reason?: string }) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/lunch-return`,
      data,
    ),

  /**
   * PATCH /attendances/{id}/check-out
   * Body: { check_out: "YYYY-MM-DDTHH:mm:ss+offset", reason?: string }
   */
  checkOut: (attendanceId: string, data: { check_out: string; reason?: string }) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/check-out`,
      data,
    ),

  /**
   * PATCH /attendances/{id}/overtime-decision
   * Body: { authorize: boolean, valuation_method?, agreed_rate?, agreed_factor?, reason? }
   * valuation_method is required when authorize=true; agreed_rate/agreed_factor are
   * required depending on the chosen method.
   */
  overtimeDecision: (
    attendanceId: string,
    data: {
      authorize: boolean
      valuation_method?: OvertimeValuationMethod
      agreed_rate?: number
      agreed_factor?: number
      reason?: string
    },
  ) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/overtime-decision`,
      data,
    ),

  /**
   * GET /attendances/{id}/overtime-preview?valuation_method=...&agreed_rate=...&agreed_factor=...
   * Read-only preview of the amount that would be paid — nothing is persisted.
   */
  previewOvertimeValuation: (
    attendanceId: string,
    params: {
      valuation_method: OvertimeValuationMethod
      agreed_rate?: number
      agreed_factor?: number
    },
  ) =>
    apiClient.get<{ status: number; data: OvertimeValuationPreview }>(
      `/attendances/${attendanceId}/overtime-preview`,
      { params },
    ),

  /**
   * POST /attendances/day-status
   * Body: { employee_id: ULID, date: "YYYY-MM-DD", day_status: "ABSENCE", reason?: string }
   */
  markDayStatus: (data: { employee_id: string; date: string; day_status: 'ABSENCE'; reason?: string }) =>
    apiClient.post<{ status: number; data: AttendanceRecord }>('/attendances/day-status', data),

  /**
   * POST /attendances/close-day
   * Closes the day for a branch: registers pending lunch returns,
   * batch check-out, and marks absences in one transaction.
   */
  closeDay: (data: CloseDayRequest) =>
    apiClient.post<{ status: number; data: CloseDayResponse }>(
      '/attendances/close-day',
      data,
    ),
}
