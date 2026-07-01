import { useVacationEntitlements } from '@/services/vacation-hooks'

export function useVacationSection(employeeId: string) {
  const { data: entitlements = [], isLoading } = useVacationEntitlements(employeeId)

  return { entitlements, isLoading }
}
