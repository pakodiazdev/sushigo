import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { TodayReportResponse } from '@/types/report'

// ── API layer ──────────────────────────────────────────────────────────────────

export const reportApi = {
  /**
   * GET /reports/today?branch_id=<id>
   * Returns today's operational report for all active employees of the branch.
   */
  getToday: (branchId: number) =>
    apiClient.get<{ status: number; data: TodayReportResponse }>('/reports/today', {
      params: { branch_id: branchId },
    }),
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Fetch today's operational report for a branch.
 * Auto-refreshes every 2 minutes so the manager sees new check-ins
 * without reloading the page.
 *
 * @param branchId  Integer branch id (from auth store currentBranch.id)
 */
export function useTodayReport(branchId: number | null) {
  return useQuery<TodayReportResponse>({
    queryKey: ['reports', 'today', branchId],
    queryFn: async () => {
      const response = await reportApi.getToday(branchId!)
      return response.data.data
    },
    enabled: !!branchId,
    refetchInterval: 2 * 60 * 1000,  // 2 minutes — as specified in issue #067
    staleTime: 60 * 1000,
  })
}
