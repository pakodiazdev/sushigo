import { useQuery } from '@tanstack/react-query'
import { scheduleApi } from '@/services/schedule-api'
import type { EmployeeScheduleHistoryItem } from '@/types/schedule'

interface ScheduleHistoryData {
  data: EmployeeScheduleHistoryItem[]
}

export function useScheduleHistory(periodId: string | null) {
  return useQuery<ScheduleHistoryData>({
    queryKey: ['schedule-history', periodId],
    queryFn: async () => {
      if (!periodId) return { data: [] }
      const res = await scheduleApi.getHistory(periodId)
      return res.data
    },
    enabled: !!periodId,
    staleTime: 60_000, // 1 minute
  })
}
