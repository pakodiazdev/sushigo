import { useOvertimeBank } from '@/services/overtime-bank-hooks'

export function useOvertimeBankSection(employeeId: string) {
  const { data, isLoading } = useOvertimeBank(employeeId)

  return {
    movements: data?.movements ?? [],
    summary: data?.summary ?? null,
    isLoading,
  }
}
