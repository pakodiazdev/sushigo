import { useAuthStore } from '@/stores/auth.store'
import { useTodayReport } from '@/services/report.service'
import type { TodayReportEmployee, TodayReportSummary } from '@/types/report'

export type { TodayReportEmployee, EmployeeOperationalStatus } from '@/types/report'

export interface UseTodayReportPageResult {
  employees: TodayReportEmployee[]
  summary: TodayReportSummary
  isLoading: boolean
  isError: boolean
  hasBranch: boolean
  branchName: string | null
}

const EMPTY_SUMMARY: TodayReportSummary = {
  total_employees: 0,
  arrived: 0,
  not_arrived: 0,
  late_count: 0,
}

export function useTodayReportPage(): UseTodayReportPageResult {
  const currentBranch = useAuthStore((s) => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { data, isLoading, isError } = useTodayReport(branchId)

  return {
    employees: data?.employees ?? [],
    summary: data?.summary ?? EMPTY_SUMMARY,
    isLoading,
    isError,
    hasBranch: !!branchId,
    branchName: currentBranch?.name ?? null,
  }
}
