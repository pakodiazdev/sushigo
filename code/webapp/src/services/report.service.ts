import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { TodayReportResponse, WeeklySummaryResponse } from '@/types/report'

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

  /**
   * GET /reports/weekly-summary?employee_id=<ulid>&period_start=<date>&period_end=<date>
   * Returns the full payroll breakdown for one employee over a week.
   */
  getWeeklySummary: (employeeId: string, periodStart: string, periodEnd: string) =>
    apiClient.get<{ status: number; data: WeeklySummaryResponse }>('/reports/weekly-summary', {
      params: { employee_id: employeeId, period_start: periodStart, period_end: periodEnd },
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

/**
 * Fetch the weekly payroll summary for one employee.
 *
 * @param employeeId   ULID public_id of the employee
 * @param periodStart  ISO date string (YYYY-MM-DD)
 * @param periodEnd    ISO date string (YYYY-MM-DD)
 */
export function useWeeklySummary(
  employeeId: string | null,
  periodStart: string | null,
  periodEnd: string | null,
) {
  return useQuery<WeeklySummaryResponse>({
    queryKey: ['reports', 'weekly-summary', employeeId, periodStart, periodEnd],
    queryFn: async () => {
      const response = await reportApi.getWeeklySummary(employeeId!, periodStart!, periodEnd!)
      return response.data.data
    },
    enabled: !!employeeId && !!periodStart && !!periodEnd,
    staleTime: 5 * 60 * 1000,
  })
}
