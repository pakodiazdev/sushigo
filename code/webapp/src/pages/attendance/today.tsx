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
import { ExtraDayNegotiationDialog } from '@/components/attendance/ExtraDayNegotiationDialog'
import { useTodayAttendancePage } from './-use-today-attendance-page'
import { useApplicationTimeLabel } from '@/hooks/use-application-time-label'
import { todayDateCdmx } from '@/lib/datetime'
import type { PendingAttendanceData } from './-use-today-attendance-page'
import type { TodayAttendanceEmployee, OvertimePendingEntry } from '@/types/attendance'

// ── Module-level helpers (keep complexity out of the component) ───────────────

/** Full name from a check-in pending employee (direct TodayAttendanceEmployee). */
function checkInName(employee: TodayAttendanceEmployee | null): string {
  if (!employee) return ''
  return `${employee.first_name} ${employee.last_name}`
}

/** Full name from a pending attendance action (has nested .employee). */
function pendingName(pending: PendingAttendanceData | null): string {
  if (!pending) return ''
  return `${pending.employee.first_name} ${pending.employee.last_name}`
}

interface OvertimeDialogState {
  isOpen: boolean
  employeeName: string
  overtimeMinutes: number
  onAuthorize: () => void
  onReject: () => void
  onClose: () => void
}

/** Resolve overtime dialog props — individual flow takes priority over bulk queue. */
function resolveOvertimeDialog(
  individual: PendingAttendanceData | null,
  bulk: OvertimePendingEntry | null,
  individualMinutes: number,
  confirmIndividual: (auth: boolean) => void,
  closeIndividual: () => void,
  confirmBulk: (auth: boolean) => void,
  closeBulk: () => void,
): OvertimeDialogState {
  if (individual) {
    return {
      isOpen: true,
      employeeName: `${individual.employee.first_name} ${individual.employee.last_name}`,
      overtimeMinutes: individualMinutes,
      onAuthorize: () => confirmIndividual(true),
      onReject: () => confirmIndividual(false),
      onClose: closeIndividual,
    }
  }
  return {
    isOpen: !!bulk,
    employeeName: bulk?.employee_name ?? '',
    overtimeMinutes: bulk?.overtime_minutes ?? 0,
    onAuthorize: () => confirmBulk(true),
    onReject: () => confirmBulk(false),
    onClose: closeBulk,
  }
}

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
    pendingOvertimeMinutes,
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
    // Extra day express
    extraDayRow,
    isRegisteringExtraDay,
    closeExtraDay,
    confirmExtraDay,
  } = useTodayAttendancePage()

  const maxTime = useApplicationTimeLabel()
  const closeDayPanel = useCloseDayPanel(rows, branchId, maxTime)

  // Feed bulk overtime decisions from the close-day panel into the queue
  const { overtimePending, clearOvertimePending } = closeDayPanel
  useEffect(() => {
    if (overtimePending.length > 0) {
      enqueueBulkOvertime(overtimePending)
      clearOvertimePending()
    }
  }, [overtimePending, enqueueBulkOvertime, clearOvertimePending])

  const overtimeDialog = resolveOvertimeDialog(
    pendingOvertimeDecision,
    currentBulkOvertime,
    pendingOvertimeMinutes,
    confirmOvertimeDecision,
    closeOvertimeDecision,
    confirmBulkOvertimeDecision,
    closeBulkOvertimeDecision,
  )

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
        employeeName={checkInName(pendingCheckInEmployee)}
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
        employeeName={pendingName(pendingLunchStart)}
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
        employeeName={pendingName(pendingLunchReturn)}
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
        employeeName={pendingName(pendingCheckOut)}
        confirmLabel="Confirmar salida"
        initialTime={maxTime}
        maxTime={maxTime}
        inputId="checkout-time"
        inputLabel="Hora de salida"
        isLoading={isCheckingOut}
      />

      {/* Overtime Decision Dialog — handles both individual and bulk day close flows */}
      <OvertimeDecisionDialog
        {...overtimeDialog}
        isLoading={isRecordingOvertimeDecision}
      />

      {/* Close Day Panel */}
      <CloseDayPanel panel={closeDayPanel} />

      {/* Extra Day Negotiation Dialog */}
      {extraDayRow && (
        <ExtraDayNegotiationDialog
          employee={extraDayRow.employee}
          date={todayDateCdmx()}
          registeredDailyWage={null}
          isPending={isRegisteringExtraDay}
          onConfirm={confirmExtraDay}
          onCancel={closeExtraDay}
        />
      )}
    </PageContainer>
  )
}
