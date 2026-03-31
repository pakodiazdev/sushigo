import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from './attendance-api'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TodayAttendanceRow } from '@/types/attendance'

/**
 * Fetch today's attendance for all active employees of a branch.
 * Auto-refreshes every 30 seconds so the page stays live.
 *
 * @param branchId  Integer branch id (from auth store currentBranch.id)
 */
export function useTodayAttendance(branchId: number | null) {
  return useQuery<TodayAttendanceRow[]>({
    queryKey: ['attendances', 'today', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const response = await attendanceApi.today(branchId)
      return response.data.data
    },
    enabled: !!branchId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/**
 * Mutation: register check-in for an employee.
 * On success: invalidates the today attendance query and shows a toast.
 */
export function useCheckIn() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { employee_id: string; check_in: string }) =>
      attendanceApi.checkIn(data),
    onSuccess: () => {
      // Invalidate all today-attendance queries (any branch) to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['attendances', 'today'] })
      showSuccess('Entrada registrada correctamente.', 'Check-in')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar la entrada.'),
        'Error al registrar'
      )
    },
  })
}
