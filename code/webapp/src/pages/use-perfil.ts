import { useAuthStore } from '@/stores/auth.store'
import { useMyEmployee } from '@/services/employee-hooks'
import { formatFirstLast } from '@/lib/format'

export interface UsePerfilResult {
  displayName: string
  email: string
  avatarUrl: string | null | undefined
  isLoadingEmployee: boolean
}

export function usePerfilPage(): UsePerfilResult {
  const user = useAuthStore((s) => s.user)
  const { data: employee, isLoading: isLoadingEmployee } = useMyEmployee()

  return {
    displayName: formatFirstLast(employee?.user) || user?.name || '',
    email: user?.email ?? '',
    avatarUrl: user?.avatar_url,
    isLoadingEmployee,
  }
}
