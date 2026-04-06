import { apiClient } from '@/lib/api-client'
import type { TodayAttendanceResponse, AttendanceRecord, CloseDayRequest, CloseDayResponse } from '@/types/attendance'

export const attendanceApi = {
  /**
   * GET /attendances/today?branch_id=<id>
   * Returns all active employees for the branch with their today's attendance (if any).
   */
  today: (branchId: number) =>
    apiClient.get<TodayAttendanceResponse>('/attendances/today', {
      params: { branch_id: branchId },
    }),

  /**
   * POST /attendances/check-in
   * Registers the employee's check-in at the given datetime.
   * Body: { employee_id: ULID, check_in: "YYYY-MM-DDTHH:mm:ss" }
   */
  checkIn: (data: { employee_id: string; check_in: string }) =>
    apiClient.post<{ status: number; data: AttendanceRecord }>('/attendances/check-in', data),

  /**
   * PATCH /attendances/{id}/lunch-start
   * Registers the employee's lunch start (salida a comida) at the given datetime.
   * Body: { lunch_start: "YYYY-MM-DDTHH:mm:ss+offset" }
   */
  lunchStart: (attendanceId: string, data: { lunch_start: string }) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/lunch-start`,
      data,
    ),

  /**
   * PATCH /attendances/{id}/lunch-return
   * Registers the employee's return from lunch (regreso de comida) at the given datetime.
   * Body: { lunch_end: "YYYY-MM-DDTHH:mm:ss+offset" }
   */
  lunchReturn: (attendanceId: string, data: { lunch_end: string }) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/lunch-return`,
      data,
    ),

  /**
   * PATCH /attendances/{id}/check-out
   * Registers the employee's check-out (departure) at the given datetime.
   * Body: { check_out: "YYYY-MM-DDTHH:mm:ss+offset" }
   */
  checkOut: (attendanceId: string, data: { check_out: string }) =>
    apiClient.patch<{ status: number; data: AttendanceRecord }>(
      `/attendances/${attendanceId}/check-out`,
      data,
    ),

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
