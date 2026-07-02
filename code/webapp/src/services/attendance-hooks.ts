import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from './attendance-api'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TodayAttendanceRow, CloseDayRequest } from '@/types/attendance'

/**
 * Fetch attendance for all active employees of a branch for a given date.
 * Auto-refreshes every 30 seconds so the page stays live.
 *
 * @param branchId  Integer branch id (from auth store currentBranch.id)
 * @param date      Optional date in YYYY-MM-DD; defaults to today on the server
 */
export function useDailyAttendance(branchId: number | null, date?: string) {
  return useQuery<TodayAttendanceRow[]>({
    queryKey: ['attendances', 'daily', date ?? 'today', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const response = await attendanceApi.daily(branchId, date)
      return response.data.data
    },
    enabled: !!branchId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/** @deprecated Use useDailyAttendance instead */
export function useTodayAttendance(branchId: number | null) {
  return useDailyAttendance(branchId)
}

/**
 * Mutation: register check-in for an employee.
 * On success: invalidates the daily attendance query and shows a toast.
 */
export function useCheckIn() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { employee_id: string; check_in: string; reason?: string }) =>
      attendanceApi.checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
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
 */
export function useLunchStart() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; lunch_start: string; reason?: string }) =>
      attendanceApi.lunchStart(data.attendance_id, { lunch_start: data.lunch_start, reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
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
 */
export function useLunchReturn() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; lunch_end: string; reason?: string }) =>
      attendanceApi.lunchReturn(data.attendance_id, { lunch_end: data.lunch_end, reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
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
 */
export function useCheckOut() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; check_out: string; reason?: string }) =>
      attendanceApi.checkOut(data.attendance_id, { check_out: data.check_out, reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
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
 * Mutation: record the Manager's overtime decision (authorize or reject) for an attendance.
 */
export function useOvertimeDecision() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { attendance_id: string; authorize: boolean; reason?: string }) =>
      attendanceApi.overtimeDecision(data.attendance_id, { authorize: data.authorize, reason: data.reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      const label = variables.authorize ? 'Horas extra autorizadas.' : 'Horas extra no pagadas.'
      showSuccess(label, 'Decisión registrada')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar la decisión.'),
        'Error al registrar'
      )
    },
  })
}

/**
 * Mutation: mark an employee's day as ABSENCE (unexcused no-show).
 */
export function useMarkDayStatus() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: { employee_id: string; date: string; day_status: 'ABSENCE'; reason?: string }) =>
      attendanceApi.markDayStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      showSuccess('Día marcado como falta.', 'Día marcado')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo marcar el día.'),
        'Error al marcar'
      )
    },
  })
}

/**
 * Mutation: close the day for a branch (batch lunch returns + check-outs + absences).
 */
export function useCloseDay() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CloseDayRequest) => attendanceApi.closeDay(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      const d = response.data.data
      const parts: string[] = []
      if (d.lunch_returns > 0) parts.push(`${d.lunch_returns} regresos`)
      if (d.check_outs > 0) parts.push(`${d.check_outs} salidas`)
      if (d.absences > 0) parts.push(`${d.absences} faltas`)
      if (d.leaves > 0) parts.push(`${d.leaves} permisos`)
      if (d.day_offs > 0) parts.push(`${d.day_offs} descansos`)
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
