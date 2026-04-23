import { useQuery } from '@tanstack/react-query'
import { employeeRequestApi } from './employee-request-api'
import type { EmployeeRequestFilters } from '@/types/employee-request'

export function useEmployeeRequests(filters?: EmployeeRequestFilters) {
  return useQuery({
    queryKey: ['employee-requests', filters],
    queryFn: async () => {
      const response = await employeeRequestApi.list(filters)
      return response.data
    },
  })
}

export function usePendingRequestsCount({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['employee-requests', 'pending-count'],
    queryFn: async () => {
      const response = await employeeRequestApi.list({ status: 'PENDING', per_page: 1 })
      return response.data.meta?.total ?? 0
    },
    refetchInterval: 60_000,
    enabled,
  })
}
