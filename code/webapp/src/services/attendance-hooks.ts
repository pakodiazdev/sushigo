import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from './attendance-api'
import type { TodayAttendanceRow } from '@/types/attendance'

// ============================================================================
// Attendance Query Hooks
// ============================================================================

/**
 * Fetch today's attendance for all active employees of a branch.
 * Auto-refreshes every 30 seconds so the page stays live.
 *
 * @param branchId  Integer branch id (from auth store currentBranch.id)
 */
export function useTodayAttendance(branchId: number | null) {
  return useQuery<TodayAttendanceRow[]>({
    queryKey: ['attendances', 'today', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const response = await attendanceApi.today(branchId)
      return response.data.data
    },
    enabled: !!branchId,
    refetchInterval: 30_000,   // Live refresh every 30 s
    staleTime: 15_000,
  })
}
