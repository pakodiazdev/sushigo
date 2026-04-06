import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from './attendance-api'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TodayAttendanceRow, CloseDayRequest } from '@/types/attendance'

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

/**
 * Mutation: register lunch-start (salida a comida) for an employee.
 * On success: invalidates the today attendance query and shows a toast.
 */
export function useLunchStart() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; lunch_start: string }) =>
      attendanceApi.lunchStart(data.attendance_id, { lunch_start: data.lunch_start }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'today'] })
      showSuccess('Salida a comida registrada correctamente.', 'Lunch Start')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar la salida a comida.'),
        'Error al registrar'
      )
    },
  })
}

/**
 * Mutation: register lunch-return (regreso de comida) for an employee.
 * On success: invalidates the today attendance query and shows a toast.
 */
export function useLunchReturn() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; lunch_end: string }) =>
      attendanceApi.lunchReturn(data.attendance_id, { lunch_end: data.lunch_end }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'today'] })
      showSuccess('Regreso de comida registrado correctamente.', 'Lunch Return')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar el regreso de comida.'),
        'Error al registrar'
      )
    },
  })
}

/**
 * Mutation: register check-out for an employee.
 * On success: invalidates the today attendance query and shows a toast.
 */
export function useCheckOut() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; check_out: string }) =>
      attendanceApi.checkOut(data.attendance_id, { check_out: data.check_out }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'today'] })
      showSuccess('Salida registrada correctamente.', 'Check-out')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar la salida.'),
        'Error al registrar'
      )
    },
  })
}

/**
 * Mutation: close the day for a branch (batch lunch returns + check-outs + absences).
 * On success: invalidates the today attendance query and shows a summary toast.
 */
export function useCloseDay() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CloseDayRequest) => attendanceApi.closeDay(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'today'] })
      const d = response.data.data
      const parts: string[] = []
      if (d.lunch_returns > 0) parts.push(`${d.lunch_returns} regresos`)
      if (d.check_outs > 0) parts.push(`${d.check_outs} salidas`)
      if (d.absences > 0) parts.push(`${d.absences} faltas`)
      showSuccess(parts.join(', ') || 'Sin cambios', 'Día cerrado')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo cerrar el día.'),
        'Error al cerrar'
      )
    },
  })
}
