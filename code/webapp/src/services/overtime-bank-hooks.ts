import { useQuery } from '@tanstack/react-query'
import { overtimeBankApi } from '@/services/overtime-bank-api'

export function useOvertimeBank(employeeId: string) {
  return useQuery({
    queryKey: ['overtime-bank', employeeId],
    queryFn: async () => {
      const response = await overtimeBankApi.getBank(employeeId)
      return { movements: response.data.data, summary: response.data.meta }
    },
    enabled: !!employeeId,
  })
}
