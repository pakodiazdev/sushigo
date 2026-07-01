import { useQuery } from '@tanstack/react-query'
import { vacationApi } from '@/services/vacation.service'

const QUERY_KEY = (employeeId: string) => ['vacation-entitlements', employeeId]

export function useVacationEntitlements(employeeId: string) {
  return useQuery({
    queryKey: QUERY_KEY(employeeId),
    queryFn: async () => {
      const response = await vacationApi.getEntitlements(employeeId)
      return { entitlements: response.data.data, summary: response.data.meta }
    },
    enabled: !!employeeId,
  })
}
