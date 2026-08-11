import { useState, useEffect, useRef } from 'react'
import { getAttendancePhase } from '@/types/attendance'
import type { AttendancePhase, TodayAttendanceEmployee, TodayAttendanceRow } from '@/types/attendance'

export interface EmployeeAttendanceCardState {
  phase: AttendancePhase
  isScheduledRestDay: boolean
  isFullDayLeave: boolean
  isPendingVacation: boolean
  // Crossfade of the pending (Registrar entrada/Marcar falta) vs. "Justificar
  // falta" actions — which phase's actions are currently rendered, and
  // whether they're mid fade-out (see displayedActionsPhase in the effect below).
  displayedActionsPhase: AttendancePhase
  actionsFadingOut: boolean
  // Confirm-falta dialog
  confirmFaltaOpen: boolean
  openConfirmFalta: () => void
  closeConfirmFalta: () => void
  confirmFalta: () => void
  // Ask-justify-now dialog
  askJustifyOpen: boolean
  declineJustifyNow: () => void
  acceptJustifyNow: () => void
  // Justify (RegisterLeaveDialog)
  showJustifyDialog: boolean
  openJustifyDialog: () => void
  closeJustifyDialog: () => void
}

/**
 * Owns all state and phase-transition logic for a single EmployeeAttendanceCard:
 * the mark-falta → ask-justify-now? → justify-dialog flow, and the crossfade
 * between the pending actions and the "Justificar falta" button.
 */
export function useEmployeeAttendanceCard(
  row: TodayAttendanceRow,
  onMarkDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE') => Promise<boolean>,
  onFaltaFlowComplete?: (employeeId: string) => void,
): EmployeeAttendanceCardState {
  const phase = getAttendancePhase(row.attendance)
  const isScheduledRestDay = row.schedule?.is_day_off === true
  const isFullDayLeave = row.today_leave?.time_mode === 'OPEN_ENDED'
  // Approved vacation is a terminal state — check-in is blocked backend-side
  // (RegisterCheckInAction::guardNoApprovedVacation) and "Marcar falta" makes
  // no sense for an employee who's on approved vacation, not unexcused. Only
  // relevant while phase is still 'pending': once an Attendance record with a
  // real day_status exists, that already drives the phase-based UI below.
  const isPendingVacation = phase === 'pending' && row.today_vacation === true

  const [confirmFaltaOpen, setConfirmFaltaOpen] = useState(false)
  const [askJustifyOpen, setAskJustifyOpen] = useState(false)
  const [showJustifyDialog, setShowJustifyDialog] = useState(false)

  const [displayedActionsPhase, setDisplayedActionsPhase] = useState(phase)
  const [actionsFadingOut, setActionsFadingOut] = useState(false)
  const actionsFadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (phase === displayedActionsPhase) return

    const isPendingAbsenceSwap =
      (displayedActionsPhase === 'pending' && phase === 'absence') ||
      (displayedActionsPhase === 'absence' && phase === 'pending')

    if (!isPendingAbsenceSwap) {
      setDisplayedActionsPhase(phase)
      setActionsFadingOut(false)
      return
    }

    setActionsFadingOut(true)
    actionsFadeTimer.current = setTimeout(() => {
      setDisplayedActionsPhase(phase)
      setActionsFadingOut(false)
    }, 200)

    return () => clearTimeout(actionsFadeTimer.current)
  }, [phase, displayedActionsPhase])

  return {
    phase,
    isScheduledRestDay,
    isFullDayLeave,
    isPendingVacation,
    displayedActionsPhase,
    actionsFadingOut,
    confirmFaltaOpen,
    openConfirmFalta: () => setConfirmFaltaOpen(true),
    closeConfirmFalta: () => setConfirmFaltaOpen(false),
    confirmFalta: () => {
      setConfirmFaltaOpen(false)
      // Only open the justify-now? dialog once the mutation actually
      // succeeds — a failure (e.g. a 422 because an Attendance record
      // already exists for that date) must not walk the card through the
      // justify-now? → exit-animation flow toward 'absent' when the row
      // never actually landed there; the mutation's own onError already
      // surfaces a toast, and the page-level markDayStatus already released
      // the pin so the card doesn't stay stuck.
      onMarkDayStatus(row.employee, 'ABSENCE').then((succeeded) => {
        if (succeeded) setAskJustifyOpen(true)
      })
    },
    askJustifyOpen,
    declineJustifyNow: () => {
      setAskJustifyOpen(false)
      onFaltaFlowComplete?.(row.employee.id)
    },
    acceptJustifyNow: () => {
      setAskJustifyOpen(false)
      setShowJustifyDialog(true)
    },
    showJustifyDialog,
    openJustifyDialog: () => setShowJustifyDialog(true),
    closeJustifyDialog: () => {
      setShowJustifyDialog(false)
      onFaltaFlowComplete?.(row.employee.id)
    },
  }
}
