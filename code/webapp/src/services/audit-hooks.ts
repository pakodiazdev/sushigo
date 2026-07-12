import { useQuery } from '@tanstack/react-query'
import { auditApi } from './audit.service'
import type { AuditLogFilters } from '@/types/attendance-payroll'

export function useAuditLog(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const response = await auditApi.list(filters)
      return response.data
    },
  })
}
