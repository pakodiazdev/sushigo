import { useVacationEntitlements } from '@/services/vacation-hooks'

export function useVacationSection(employeeId: string) {
  const { data, isLoading } = useVacationEntitlements(employeeId)

  return {
    entitlements: data?.entitlements ?? [],
    summary: data?.summary ?? null,
    isLoading,
  }
}
