import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { RefreshCw, DoorClosed } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import {
  AttendanceSummaryBar,
  AttendanceTimeDialog,
  CloseDayPanel,
  EmployeeAttendanceCard,
  EmptyState,
  ErrorState,
  NoBranchState,
  OvertimeDecisionDialog,
  SkeletonGrid,
  useCloseDayPanel,
} from '@/components/attendance'
import { useTodayAttendancePage, currentTimeLabel } from './-use-today-attendance-page'

export const Route = createFileRoute('/attendance/today')({
  beforeLoad: requirePermission('employees.view'),
  component: TodayAttendancePage,
})

export function TodayAttendancePage() {
  const {
    rows,
    summary,
    isLoading,
    isError,
    branchName,
    hasBranch,
    branchId,
    // Check-in
    pendingCheckInEmployee,
    isCheckingIn,
    openCheckIn,
    closeCheckIn,
    confirmCheckIn,
    // Lunch-start
    pendingLunchStart,
    isRegisteringLunch,
    openLunchStart,
    closeLunchStart,
    confirmLunchStart,
    // Lunch-return
    pendingLunchReturn,
    isRegisteringLunchReturn,
    openLunchReturn,
    closeLunchReturn,
    confirmLunchReturn,
    // Check-out
    pendingCheckOut,
    isCheckingOut,
    openCheckOut,
    closeCheckOut,
    confirmCheckOut,
    // Overtime decision (individual)
    pendingOvertimeDecision,
    isRecordingOvertimeDecision,
    openOvertimeDecision,
    closeOvertimeDecision,
    confirmOvertimeDecision,
    // Bulk overtime queue
    currentBulkOvertime,
    enqueueBulkOvertime,
    confirmBulkOvertimeDecision,
    closeBulkOvertimeDecision,
    // Mark day status
    markDayStatus,
  } = useTodayAttendancePage()

  const closeDayPanel = useCloseDayPanel(rows, branchId)
  const maxTime = currentTimeLabel()

  // Feed bulk overtime decisions from the close-day panel into the queue
  const { overtimePending, clearOvertimePending } = closeDayPanel
  useEffect(() => {
    if (overtimePending.length > 0) {
      enqueueBulkOvertime(overtimePending)
      clearOvertimePending()
    }
  }, [overtimePending, enqueueBulkOvertime, clearOvertimePending])

  const pendingOvertimeMinutes = pendingOvertimeDecision
    ? (rows.find(r => r.attendance?.id === pendingOvertimeDecision.attendanceId)?.attendance?.overtime_minutes ?? 0)
    : 0

  // Unified overtime dialog props — individual flow takes priority over bulk queue
  const isOvertimeDialogOpen = !!pendingOvertimeDecision || !!currentBulkOvertime
  const overtimeDialogEmployeeName = pendingOvertimeDecision
    ? `${pendingOvertimeDecision.employee.first_name} ${pendingOvertimeDecision.employee.last_name}`
    : (currentBulkOvertime?.employee_name ?? '')
  const overtimeDialogMinutes = pendingOvertimeDecision
    ? pendingOvertimeMinutes
    : (currentBulkOvertime?.overtime_minutes ?? 0)
  const handleOvertimeAuthorize = pendingOvertimeDecision
    ? () => confirmOvertimeDecision(true)
    : () => confirmBulkOvertimeDecision(true)
  const handleOvertimeReject = pendingOvertimeDecision
    ? () => confirmOvertimeDecision(false)
    : () => confirmBulkOvertimeDecision(false)
  const handleOvertimeClose = pendingOvertimeDecision
    ? closeOvertimeDecision
    : closeBulkOvertimeDecision

  if (!hasBranch) {
    return (
      <PageContainer>
        <NoBranchState />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Asistencia de Hoy"
        description={
          branchName
            ? `Sucursal: ${branchName} — actualización automática cada 30 s`
            : 'Actualización automática cada 30 s'
        }
        action={
          <div className="flex items-center gap-2">
            {isLoading && (
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {rows.length > 0 && (
              <Button size="sm" onClick={closeDayPanel.open}>
                <DoorClosed className="h-4 w-4 mr-1.5" />
                Cerrar día
              </Button>
            )}
          </div>
        }
      />

      <AttendanceSummaryBar summary={summary} />

      {isError ? (
        <ErrorState />
      ) : isLoading && rows.length === 0 ? (
        <SkeletonGrid />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <EmployeeAttendanceCard
              key={row.employee.id}
              row={row}
              onCheckIn={openCheckIn}
              onLunchStart={openLunchStart}
              onLunchReturn={openLunchReturn}
              onCheckOut={openCheckOut}
              onOvertimeDecision={openOvertimeDecision}
              onMarkDayStatus={markDayStatus}
            />
          ))}
        </div>
      )}

      {/* Check-in dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingCheckInEmployee}
        onClose={closeCheckIn}
        onConfirm={confirmCheckIn}
        title="Registrar entrada"
        employeeName={
          pendingCheckInEmployee
            ? `${pendingCheckInEmployee.first_name} ${pendingCheckInEmployee.last_name}`
            : ''
        }
        confirmLabel="Confirmar entrada"
        initialTime={maxTime}
        maxTime={maxTime}
        inputId="checkin-time"
        inputLabel="Hora de entrada"
        isLoading={isCheckingIn}
      />

      {/* Lunch-start dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingLunchStart}
        onClose={closeLunchStart}
        onConfirm={confirmLunchStart}
        title="Salir a comer"
        employeeName={
          pendingLunchStart
            ? `${pendingLunchStart.employee.first_name} ${pendingLunchStart.employee.last_name}`
            : ''
        }
        confirmLabel="Confirmar salida"
        initialTime={maxTime}
        maxTime={maxTime}
        inputId="lunch-time"
        inputLabel="Hora de salida"
        isLoading={isRegisteringLunch}
      />

      {/* Lunch-return dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingLunchReturn}
        onClose={closeLunchReturn}
        onConfirm={confirmLunchReturn}
        title="Regresar de comida"
        employeeName={
          pendingLunchReturn
            ? `${pendingLunchReturn.employee.first_name} ${pendingLunchReturn.employee.last_name}`
            : ''
        }
        confirmLabel="Confirmar regreso"
        initialTime={maxTime}
        maxTime={maxTime}
        inputId="lunch-return-time"
        inputLabel="Hora de regreso"
        isLoading={isRegisteringLunchReturn}
      />

      {/* Check-out dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingCheckOut}
        onClose={closeCheckOut}
        onConfirm={confirmCheckOut}
        title="Registrar salida"
        employeeName={
          pendingCheckOut
            ? `${pendingCheckOut.employee.first_name} ${pendingCheckOut.employee.last_name}`
            : ''
        }
        confirmLabel="Confirmar salida"
        initialTime={maxTime}
        maxTime={maxTime}
        inputId="checkout-time"
        inputLabel="Hora de salida"
        isLoading={isCheckingOut}
      />

      {/* Overtime Decision Dialog — handles both individual and bulk day close flows */}
      <OvertimeDecisionDialog
        isOpen={isOvertimeDialogOpen}
        employeeName={overtimeDialogEmployeeName}
        overtimeMinutes={overtimeDialogMinutes}
        isLoading={isRecordingOvertimeDecision}
        onAuthorize={handleOvertimeAuthorize}
        onReject={handleOvertimeReject}
        onClose={handleOvertimeClose}
      />

      {/* Close Day Panel */}
      <CloseDayPanel panel={closeDayPanel} />
    </PageContainer>
  )
}
