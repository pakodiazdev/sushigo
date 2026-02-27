import { createFileRoute } from '@tanstack/react-router'
import {
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  LogIn,
} from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { useTodayAttendancePage } from './-use-today-attendance-page'
import { getAttendancePhase, formatTime, formatSeconds } from '@/types/attendance'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee } from '@/types/attendance'

export const Route = createFileRoute('/attendance/today')({
  component: TodayAttendancePage,
})

// #region Page

export function TodayAttendancePage() {
  const {
    rows,
    summary,
    isLoading,
    isError,
    branchName,
    hasBranch,
    pendingCheckInEmployee,
    isCheckingIn,
    confirmTimeLabel,
    openCheckIn,
    closeCheckIn,
    confirmCheckIn,
  } = useTodayAttendancePage()

  if (!hasBranch) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertTriangle className="h-10 w-10 text-yellow-500" />
          <p className="text-lg font-medium text-foreground">Sin sucursal seleccionada</p>
          <p className="text-sm text-muted-foreground">
            Selecciona una sucursal en la barra lateral para ver la asistencia de hoy.
          </p>
        </div>
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

      <SummaryBar
        total={summary.total}
        pending={summary.pending}
        checkedIn={summary.checkedIn}
        done={summary.done}
        withOvertime={summary.withOvertime}
      />

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
            />
          ))}
        </div>
      )}

      {/* Check-in confirmation dialog — single instance for the whole list */}
      <ConfirmDialog
        isOpen={!!pendingCheckInEmployee}
        onClose={closeCheckIn}
        onConfirm={confirmCheckIn}
        title="Registrar entrada"
        description={
          pendingCheckInEmployee
            ? `¿Confirmas el check-in de ${pendingCheckInEmployee.first_name} ${pendingCheckInEmployee.last_name} a las ${confirmTimeLabel}?`
            : ''
        }
        confirmLabel="Confirmar entrada"
        variant="info"
        isLoading={isCheckingIn}
      />
    </PageContainer>
  )
}

// #endregion

// #region Summary Bar

interface SummaryBarProps {
  total: number
  pending: number
  checkedIn: number
  done: number
  withOvertime: number
}

function SummaryBar({ total, pending, checkedIn, done, withOvertime }: SummaryBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryStat
        label="Total empleados"
        value={total}
        icon={<Users className="h-4 w-4" />}
        colorClass="text-foreground"
      />
      <SummaryStat
        label="Pendientes"
        value={pending}
        icon={<XCircle className="h-4 w-4" />}
        colorClass="text-muted-foreground"
      />
      <SummaryStat
        label="En trabajo"
        value={checkedIn}
        icon={<Clock className="h-4 w-4" />}
        colorClass="text-blue-600 dark:text-blue-400"
      />
      <SummaryStat
        label="Completados"
        value={done}
        icon={<CheckCircle2 className="h-4 w-4" />}
        colorClass="text-green-600 dark:text-green-400"
      />
      {withOvertime > 0 && (
        <div className="col-span-2 sm:col-span-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <span className="font-semibold">{withOvertime}</span>{' '}
              {withOvertime === 1 ? 'empleado tiene' : 'empleados tienen'} overtime pendiente de autorización.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryStat({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
      <div className={cn('shrink-0', colorClass)}>{icon}</div>
      <div>
        <p className={cn('text-2xl font-bold leading-none', colorClass)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// #endregion

// #region Employee Card

interface EmployeeAttendanceCardProps {
  row: TodayAttendanceRow
  onCheckIn: (employee: TodayAttendanceEmployee) => void
}

function EmployeeAttendanceCard({ row, onCheckIn }: EmployeeAttendanceCardProps) {
  const phase = getAttendancePhase(row.attendance)
  const att = row.attendance

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors',
        phaseCardClass(phase),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate text-foreground">
            {row.employee.last_name}, {row.employee.first_name}
          </p>
          <p className="text-xs text-muted-foreground">{row.employee.code}</p>
        </div>
        <PhaseBadge phase={phase} />
      </div>

      {row.employee.roles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {row.employee.roles.map((role) => (
            <span
              key={role}
              className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-medium uppercase tracking-wide"
            >
              {role}
            </span>
          ))}
        </div>
      )}

      {att ? (
        <div className="space-y-1.5 text-xs">
          <TimeRow icon="↗" label="Entrada" value={formatTime(att.check_in)} />
          {(att.entry_late_seconds ?? 0) > 0 ? (
            <LateRow label="Tardanza entrada" value={formatSeconds(att.entry_late_seconds)} deductible={att.is_entry_deductible} />
          ) : null}
          {att.lunch_start && (
            <TimeRow icon="🍽" label="Salida comida" value={formatTime(att.lunch_start)} />
          )}
          {att.lunch_end && (
            <TimeRow icon="↩" label="Regreso comida" value={formatTime(att.lunch_end)} />
          )}
          {att.check_out && (
            <TimeRow icon="↙" label="Salida" value={formatTime(att.check_out)} />
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sin registro aún</p>
      )}

      {/* Check-in action — only for pending employees */}
      {phase === 'pending' && (
        <Button
          size="sm"
          className="w-full mt-auto"
          onClick={() => onCheckIn(row.employee)}
        >
          <LogIn className="h-3.5 w-3.5 mr-1.5" />
          Registrar entrada
        </Button>
      )}

      {/* Overtime alert */}
      {att?.requires_overtime_decision && (
        <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-2 py-1.5">
          <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <span className="text-[11px] text-yellow-800 dark:text-yellow-300 font-medium">
            Overtime: {att.overtime_minutes} min — pendiente autorización
          </span>
        </div>
      )}
    </div>
  )
}

// #endregion

// #region Phase helpers

function phaseCardClass(phase: AttendancePhase): string {
  switch (phase) {
    case 'pending':    return 'border-muted/60 opacity-70'
    case 'checked-in': return 'border-blue-200 dark:border-blue-800'
    case 'at-lunch':   return 'border-orange-200 dark:border-orange-800'
    case 'returned':   return 'border-teal-200 dark:border-teal-800'
    case 'done':       return 'border-green-200 dark:border-green-800'
  }
}

function PhaseBadge({ phase }: { phase: AttendancePhase }) {
  switch (phase) {
    case 'pending':
      return <Badge variant="default">⭕ Sin registro</Badge>
    case 'checked-in':
      return <Badge variant="info">⏰ En trabajo</Badge>
    case 'at-lunch':
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <UtensilsCrossed className="h-3 w-3" /> Comida
        </Badge>
      )
    case 'returned':
      return <Badge variant="info">↩ Regresó</Badge>
    case 'done':
      return <Badge variant="success">✅ Completo</Badge>
  }
}

function TimeRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1">
        <span>{icon}</span>
        {label}
      </span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  )
}

function LateRow({
  label,
  value,
  deductible,
}: {
  label: string
  value: string
  deductible: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded bg-red-50 dark:bg-red-950/30 px-2 py-0.5">
      <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
        <AlertTriangle className="h-2.5 w-2.5" />
        {label}
        {deductible && (
          <span className="ml-1 text-[9px] bg-red-200 dark:bg-red-800 rounded px-1 uppercase tracking-wide">
            deducible
          </span>
        )}
      </span>
      <span className="font-mono text-red-700 dark:text-red-400 font-medium">{value}</span>
    </div>
  )
}

// #endregion

// #region States

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <Users className="h-10 w-10 text-muted-foreground" />
      <p className="text-lg font-medium text-foreground">Sin empleados activos</p>
      <p className="text-sm text-muted-foreground">
        No hay empleados activos registrados en esta sucursal.
      </p>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <XCircle className="h-10 w-10 text-red-500" />
      <p className="text-lg font-medium text-foreground">Error al cargar</p>
      <p className="text-sm text-muted-foreground">
        No se pudo obtener la asistencia. Intenta recargar la página.
      </p>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-4 h-36 animate-pulse bg-muted/30"
        />
      ))}
    </div>
  )
}

// #endregion