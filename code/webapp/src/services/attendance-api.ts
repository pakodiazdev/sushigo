import { apiClient } from '@/lib/api-client'
import type { TodayAttendanceResponse, AttendanceRecord } from '@/types/attendance'

// ============================================================================
// Attendance API
// ============================================================================

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
}
