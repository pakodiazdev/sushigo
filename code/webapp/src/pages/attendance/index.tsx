import { useEffect, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
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
  NoMatchesForFilterState,
  OvertimeDecisionDialog,
  SkeletonGrid,
  useCloseDayPanel,
} from '@/components/attendance'
import { ExtraDayNegotiationDialog } from '@/components/attendance/ExtraDayNegotiationDialog'
import { WeeklySummaryPanel } from '@/components/attendance/WeeklySummaryPanel'
import { useWeeklySummaryDialog } from '@/components/attendance/use-weekly-summary-dialog'
import { useAttendancePermissions } from '@/components/attendance/use-attendance-permissions'
import { AuditLogDialog } from '@/components/audit'
import { AUDITABLE_TYPE_ATTENDANCE } from '@/services/audit.service'
import { useTodayAttendancePage } from './-use-today-attendance-page'
import { useApplicationTimeLabel } from '@/hooks/use-application-time-label'
import { useAuthStore } from '@/stores/auth.store'
import { todayDateCdmx } from '@/lib/datetime'
import { useBusinessDate } from '@/stores/clock.store'
import { formatFirstLast, formatLastFirst } from '@/lib/format'
import type { PendingAttendanceData } from './-use-today-attendance-page'
import type { AttendanceFilter } from '@/components/attendance'
import type { TodayAttendanceEmployee, OvertimePendingEntry, OvertimeValuationMethod } from '@/types/attendance'

const ATTENDANCE_FILTERS: readonly AttendanceFilter[] = ['total', 'pending', 'checkedIn', 'done', 'absent']

function isAttendanceFilter(value: unknown): value is AttendanceFilter {
  return typeof value === 'string' && (ATTENDANCE_FILTERS as readonly string[]).includes(value)
}

interface AttendanceSearch {
  tab?: AttendanceFilter
}

// ── Module-level helpers (keep complexity out of the component) ───────────────

/** Full name from a check-in pending employee (direct TodayAttendanceEmployee). */
function checkInName(employee: TodayAttendanceEmployee | null): string {
  if (!employee) return ''
  return formatFirstLast(employee.user)
}

/** Full name from a pending attendance action (has nested .employee). */
function pendingName(pending: PendingAttendanceData | null): string {
  if (!pending) return ''
  return formatFirstLast(pending.employee.user)
}

interface OvertimeDialogState {
  isOpen: boolean
  attendanceId: string | null
  employeeName: string
  overtimeMinutes: number
  remainingCount?: number
  onAuthorize: (method: OvertimeValuationMethod, agreedRate: number | undefined, agreedFactor: number | undefined, applyToRest: boolean) => void
  onReject: (applyToRest: boolean) => void
  onClose: () => void
}

interface ResolveOvertimeDialogArgs {
  individual: PendingAttendanceData | null
  bulk: OvertimePendingEntry | null
  individualMinutes: number
  bulkQueueLength: number
  confirmIndividual: (auth: boolean, method?: OvertimeValuationMethod, agreedRate?: number, agreedFactor?: number) => void
  closeIndividual: () => void
  confirmBulk: (auth: boolean, method?: OvertimeValuationMethod, agreedRate?: number, agreedFactor?: number, applyToRest?: boolean) => void
  closeBulk: () => void
}

/** Resolve overtime dialog props — individual flow takes priority over bulk queue. */
function resolveOvertimeDialog({
  individual,
  bulk,
  individualMinutes,
  bulkQueueLength,
  confirmIndividual,
  closeIndividual,
  confirmBulk,
  closeBulk,
}: ResolveOvertimeDialogArgs): OvertimeDialogState {
  if (individual) {
    return {
      isOpen: true,
      attendanceId: individual.attendanceId,
      employeeName: formatFirstLast(individual.employee.user),
      overtimeMinutes: individualMinutes,
      onAuthorize: (method, agreedRate, agreedFactor) => confirmIndividual(true, method, agreedRate, agreedFactor),
      onReject: () => confirmIndividual(false),
      onClose: closeIndividual,
    }
  }
  return {
    isOpen: !!bulk,
    attendanceId: bulk?.attendance_id ?? null,
    employeeName: bulk?.employee_name ?? '',
    overtimeMinutes: bulk?.overtime_minutes ?? 0,
    remainingCount: bulkQueueLength,
    onAuthorize: (method, agreedRate, agreedFactor, applyToRest) => confirmBulk(true, method, agreedRate, agreedFactor, applyToRest),
    onReject: (applyToRest) => confirmBulk(false, undefined, undefined, undefined, applyToRest),
    onClose: closeBulk,
  }
}

export const Route = createFileRoute('/attendance/')({
  beforeLoad: requirePermission('employees.view'),
  component: AttendancePage,
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => ({
    tab: isAttendanceFilter(search.tab) ? search.tab : undefined,
  }),
})

export function AttendancePage() {
  const search = useSearch({ from: '/attendance/' })
  const navigate = Route.useNavigate()

  const {
    rows,
    visibleRows,
    summary,
    isLoading,
    isError,
    branchName,
    hasBranch,
    branchId,
    selectedFilter,
    toggleFilter,
    isCardExiting,
    pinEmployeeCard,
    onFaltaFlowComplete,
    selectedDate,
    setSelectedDate,
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
    bulkOvertimeQueueLength,
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
  } = useTodayAttendancePage(search.tab ?? null)

  const maxTime = useApplicationTimeLabel()
  const closeDayPanel = useCloseDayPanel(rows, branchId, maxTime)
  const isAdmin = useAuthStore(s => s.isAdmin)
  const { can } = useAuthStore()
  const today = useBusinessDate() ?? todayDateCdmx()
  const { canEdit, requiresReason } = useAttendancePermissions(selectedDate)
  const weeklySummary = useWeeklySummaryDialog()
  const [auditRecord, setAuditRecord] = useState<{ employeeName: string; attendanceId: string } | null>(null)

  // Mirror the active tab into the URL (?tab=) so a page refresh keeps the
  // same filter — including the smart default the hook resolves on first load.
  useEffect(() => {
    navigate({
      search: (prev) => ({ ...prev, tab: selectedFilter ?? undefined }),
      replace: true,
    })
  }, [selectedFilter, navigate])

  // Feed bulk overtime decisions from the close-day panel into the queue
  const { overtimePending, clearOvertimePending } = closeDayPanel
  useEffect(() => {
    if (overtimePending.length > 0) {
      enqueueBulkOvertime(overtimePending)
      clearOvertimePending()
    }
  }, [overtimePending, enqueueBulkOvertime, clearOvertimePending])

  const overtimeDialog = resolveOvertimeDialog({
    individual: pendingOvertimeDecision,
    bulk: currentBulkOvertime,
    individualMinutes: pendingOvertimeMinutes,
    bulkQueueLength: bulkOvertimeQueueLength,
    confirmIndividual: confirmOvertimeDecision,
    closeIndividual: closeOvertimeDecision,
    confirmBulk: confirmBulkOvertimeDecision,
    closeBulk: closeBulkOvertimeDecision,
  })

  if (!hasBranch) {
    return (
      <PageContainer>
        <NoBranchState />
      </PageContainer>
    )
  }

  const isToday = selectedDate === today
  // For past-day corrective entries, allow any time up to 23:59 and start blank so
  // the admin must explicitly type the time rather than accidentally submitting the
  // current clock time.
  const effectiveMaxTime = isToday ? maxTime : '23:59'
  const effectiveInitialTime = isToday ? maxTime : ''
  const dateLabel = isToday
    ? `Sucursal: ${branchName ?? '—'} — actualización automática cada 30 s`
    : `Sucursal: ${branchName ?? '—'} — ${selectedDate}`

  return (
    <PageContainer>
      <PageHeader
        title="Asistencia"
        description={branchName ? dateLabel : 'Actualización automática cada 30 s'}
        action={
          <div className="flex items-center gap-2">
            {isLoading && (
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {/* Date picker — admin sees all past dates; manager is restricted to today */}
            <input
              type="date"
              max={today}
              min={isAdmin ? undefined : today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
              aria-label="Seleccionar fecha"
            />
            {isToday && rows.length > 0 && (
              <Button size="sm" onClick={closeDayPanel.open}>
                <DoorClosed className="h-4 w-4 mr-1.5" />
                Cerrar día
              </Button>
            )}
          </div>
        }
      />

      <AttendanceSummaryBar summary={summary} activeFilter={selectedFilter} onFilterChange={toggleFilter} />

      {(() => {
        if (isError) return <ErrorState />
        if (isLoading && rows.length === 0) return <SkeletonGrid />
        if (rows.length === 0) return <EmptyState />
        if (visibleRows.length === 0) return <NoMatchesForFilterState onShowAll={() => toggleFilter('total')} />
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleRows.map((row) => (
              <EmployeeAttendanceCard
                key={row.employee.id}
                row={row}
                canEdit={canEdit}
                isExiting={isCardExiting(row.employee.id)}
                onFaltaFlowComplete={onFaltaFlowComplete}
                onCheckIn={openCheckIn}
                onLunchStart={openLunchStart}
                onLunchReturn={openLunchReturn}
                onCheckOut={openCheckOut}
                onOvertimeDecision={openOvertimeDecision}
                onMarkDayStatus={(employee, status) => {
                  // Keep this card rendered through the justify-now? flow —
                  // its bucket is about to change and would otherwise vanish
                  // from the current tab mid-flow (see onFaltaFlowComplete).
                  pinEmployeeCard(employee.id)
                  markDayStatus(employee, status)
                }}
                onWeeklySummary={can('reports.weekly-summary')
                  ? (emp) => weeklySummary.open(emp.id, formatLastFirst(emp.user))
                  : undefined}
                onViewAudit={can('audit-logs.view')
                  ? (emp, attendanceId) => setAuditRecord({
                    employeeName: formatLastFirst(emp.user),
                    attendanceId,
                  })
                  : undefined}
              />
            ))}
          </div>
        )
      })()}

      {/* Check-in dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingCheckInEmployee}
        onClose={closeCheckIn}
        onConfirm={confirmCheckIn}
        title="Registrar entrada"
        employeeName={checkInName(pendingCheckInEmployee)}
        confirmLabel="Confirmar entrada"
        initialTime={effectiveInitialTime}
        maxTime={effectiveMaxTime}
        inputId="checkin-time"
        inputLabel="Hora de entrada"
        isLoading={isCheckingIn}
        requiresReason={requiresReason}
      />

      {/* Lunch-start dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingLunchStart}
        onClose={closeLunchStart}
        onConfirm={confirmLunchStart}
        title="Salir a comer"
        employeeName={pendingName(pendingLunchStart)}
        confirmLabel="Confirmar salida"
        initialTime={effectiveInitialTime}
        maxTime={effectiveMaxTime}
        inputId="lunch-time"
        inputLabel="Hora de salida"
        isLoading={isRegisteringLunch}
        requiresReason={requiresReason}
      />

      {/* Lunch-return dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingLunchReturn}
        onClose={closeLunchReturn}
        onConfirm={confirmLunchReturn}
        title="Regresar de comida"
        employeeName={pendingName(pendingLunchReturn)}
        confirmLabel="Confirmar regreso"
        initialTime={effectiveInitialTime}
        maxTime={effectiveMaxTime}
        inputId="lunch-return-time"
        inputLabel="Hora de regreso"
        isLoading={isRegisteringLunchReturn}
        requiresReason={requiresReason}
      />

      {/* Check-out dialog */}
      <AttendanceTimeDialog
        isOpen={!!pendingCheckOut}
        onClose={closeCheckOut}
        onConfirm={confirmCheckOut}
        title="Registrar salida"
        employeeName={pendingName(pendingCheckOut)}
        confirmLabel="Confirmar salida"
        initialTime={effectiveInitialTime}
        maxTime={effectiveMaxTime}
        inputId="checkout-time"
        inputLabel="Hora de salida"
        isLoading={isCheckingOut}
        requiresReason={requiresReason}
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
          date={selectedDate}
          registeredDailyWage={extraDayRow.employee.daily_wage}
          isPending={isRegisteringExtraDay}
          onConfirm={confirmExtraDay}
          onCancel={closeExtraDay}
        />
      )}

      {/* Weekly Summary Slide Panel */}
      <WeeklySummaryPanel weeklySummary={weeklySummary} />

      {/* Audit Log Slide Panel — history for a single attendance record */}
      {auditRecord && (
        <AuditLogDialog
          isOpen={!!auditRecord}
          onClose={() => setAuditRecord(null)}
          title={`Auditoría — ${auditRecord.employeeName}`}
          filters={{ auditable_type: AUDITABLE_TYPE_ATTENDANCE, auditable_id: auditRecord.attendanceId }}
        />
      )}
    </PageContainer>
  )
}
