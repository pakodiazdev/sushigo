import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import {
  AttendanceSummaryBar,
  AttendanceTimeDialog,
  EmployeeAttendanceCard,
  EmptyState,
  ErrorState,
  NoBranchState,
  SkeletonGrid,
} from '@/components/attendance'
import { useTodayAttendancePage, currentTimeLabel } from './-use-today-attendance-page'

export const Route = createFileRoute('/attendance/today')({
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
  } = useTodayAttendancePage()

  const maxTime = currentTimeLabel()

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
          isLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : undefined
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
    </PageContainer>
  )
}
