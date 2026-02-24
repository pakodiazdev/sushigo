import { apiClient } from '@/lib/api-client'
import type { TodayAttendanceResponse } from '@/types/attendance'

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
}
