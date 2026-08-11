import {
    UtensilsCrossed,
    AlertTriangle,
    CheckCircle,
    XCircle,
    LogIn,
    LogOut,
    Undo2,
    CalendarX,
    Clock,
    BedDouble,
    UserX,
    Lock,
    BarChart3,
    History,
    Pencil,
    Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatLastFirst } from '@/lib/format'
import { formatTime, formatSeconds, parseIsoToUtcMs } from '@/types/attendance'
import type {
    TodayAttendanceRow,
    AttendancePhase,
    TodayAttendanceEmployee,
    TodayLeave,
} from '@/types/attendance'
import { getPhaseCardClass } from './attendance-helpers'
import { RegisterLeaveDialog } from './RegisterLeaveDialog'
import { useEmployeeAttendanceCard } from './use-employee-attendance-card'
import { useApplicationNowMs } from '@/stores/clock.store'

// ── Sub-components ─────────────────────────────────────────────────────���───────

interface PhaseBadgeProps {
    phase: AttendancePhase
}

export function PhaseBadge({ phase }: Readonly<PhaseBadgeProps>) {
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
        case 'on-leave':
            return (
                <Badge variant="warning" className="flex items-center gap-1">
                    <CalendarX className="h-3 w-3" /> Ausencia
                </Badge>
            )
        case 'day-off':
            return (
                <Badge variant="info" className="flex items-center gap-1">
                    <BedDouble className="h-3 w-3" /> Descanso
                </Badge>
            )
        case 'absence':
            return (
                <Badge variant="error" className="flex items-center gap-1">
                    <UserX className="h-3 w-3" /> Falta
                </Badge>
            )
    }
}

interface TimeRowProps {
    icon: string
    label: string
    value: string
    /** Shown as a pencil affordance next to the value when provided (edit permission granted). */
    onEdit?: () => void
}

export function TimeRow({ icon, label, value, onEdit }: Readonly<TimeRowProps>) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
                <span>{icon}</span>
                {label}
            </span>
            <span className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-foreground">{value}</span>
                {onEdit && (
                    <button
                        type="button"
                        aria-label={`Corregir ${label.toLowerCase()}`}
                        onClick={onEdit}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                )}
            </span>
        </div>
    )
}

interface LateRowProps {
    label: string
    value: string
    deductible: boolean
}

export function LateRow({ label, value, deductible }: Readonly<LateRowProps>) {
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
            <span className="font-mono text-red-700 dark:text-red-400 font-medium">
                {value}
            </span>
        </div>
    )
}

interface AttendanceEventListProps {
    row: TodayAttendanceRow
    /** Both canEdit (date rule) and canCorrect (attendances.update) already combined by the caller. */
    canCorrect: boolean
    onCheckIn: (row: TodayAttendanceRow) => void
    onLunchStart: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
    onLunchReturn: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
    onCheckOut: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
}

export function AttendanceEventList({
    row,
    canCorrect,
    onCheckIn,
    onLunchStart,
    onLunchReturn,
    onCheckOut,
}: Readonly<AttendanceEventListProps>) {
    const att = row.attendance

    if (!att) {
        return <p className="text-xs text-muted-foreground italic">Sin registro aún</p>
    }

    return (
        <div className="space-y-1.5 text-xs">
            <TimeRow
                icon="↗"
                label="Entrada"
                value={formatTime(att.check_in)}
                onEdit={canCorrect && att.check_in ? () => onCheckIn(row) : undefined}
            />
            {(att.entry_late_seconds ?? 0) > 0 && (
                <LateRow
                    label="Tardanza entrada"
                    value={formatSeconds(att.entry_late_seconds)}
                    deductible={att.is_entry_deductible}
                />
            )}
            {att.lunch_start && (
                <TimeRow
                    icon="🍽"
                    label="Salida comida"
                    value={formatTime(att.lunch_start)}
                    onEdit={canCorrect ? () => onLunchStart(row.employee, att.id, att.lunch_start) : undefined}
                />
            )}
            {att.lunch_end && (
                <TimeRow
                    icon="↩"
                    label="Regreso comida"
                    value={formatTime(att.lunch_end)}
                    onEdit={canCorrect ? () => onLunchReturn(row.employee, att.id, att.lunch_end) : undefined}
                />
            )}
            {att.check_out && (
                <TimeRow
                    icon="↙"
                    label="Salida"
                    value={formatTime(att.check_out)}
                    onEdit={canCorrect ? () => onCheckOut(row.employee, att.id, att.check_out) : undefined}
                />
            )}
        </div>
    )
}

interface OvertimeAlertProps {
    overtimeMinutes: number
}

export function OvertimeAlert({ overtimeMinutes }: Readonly<OvertimeAlertProps>) {
    return (
        <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <span className="text-[11px] text-yellow-800 dark:text-yellow-300 font-medium">
                Overtime: {overtimeMinutes} min — pendiente autorización
            </span>
        </div>
    )
}

interface OvertimeDecisionBadgeProps {
    authorized: boolean
    minutes: number
}

export function OvertimeDecisionBadge({ authorized, minutes }: Readonly<OvertimeDecisionBadgeProps>) {
    if (authorized) {
        return (
            <div className="flex items-center gap-1.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2 py-1.5">
                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-[11px] text-green-800 dark:text-green-300 font-medium">
                    Overtime: {minutes} min — Pagadas
                </span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1.5 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 px-2 py-1.5">
            <XCircle className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                Overtime: {minutes} min — No pagadas
            </span>
        </div>
    )
}

interface RoleBadgesProps {
    roles: string[]
}

export function RoleBadges({ roles }: Readonly<RoleBadgesProps>) {
    if (roles.length === 0) return null

    return (
        <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
                <span
                    key={role}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-medium uppercase tracking-wide"
                >
                    {role}
                </span>
            ))}
        </div>
    )
}

// ── Leave Chip ─────────────────────────────────────────────────────────────────

interface LeaveChipProps {
    leave: TodayLeave
    nowMs?: number  // injectable for tests; defaults to a ticking Application Clock (or Date.now() when unavailable)
}

export function LeaveChip({ leave, nowMs }: Readonly<LeaveChipProps>) {
    const tickingNowMs = useApplicationNowMs()
    const effectiveNowMs = nowMs ?? tickingNowMs

    if (leave.time_mode === 'OPEN_ENDED') {
        return (
            <div
                data-testid="leave-chip-full-day"
                className="flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2"
            >
                <CalendarX className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    Permiso aprobado (todo el día)
                </span>
            </div>
        )
    }

    // SCHEDULED leave — compute contextual label based on current time
    const payLabel = leave.is_paid ? 'c/g' : 's/g'
    const parsedStartMs = leave.starts_at ? parseIsoToUtcMs(leave.starts_at) : null
    const parsedEndMs = leave.ends_at ? parseIsoToUtcMs(leave.ends_at) : null
    const startsAtMs = parsedStartMs === null || Number.isNaN(parsedStartMs) ? null : parsedStartMs
    const endsAtMs = parsedEndMs === null || Number.isNaN(parsedEndMs) ? null : parsedEndMs

    let label: string
    if (endsAtMs === null) {
        label = `Permiso ${payLabel} (horario no disponible)`
    } else if (startsAtMs !== null && startsAtMs > effectiveNowMs) {
        // Leave hasn't started yet — employee will arrive at work when the leave ends
        label = `Llega a las ${formatTime(leave.ends_at)} (permiso ${payLabel})`
    } else if (endsAtMs < effectiveNowMs) {
        // Leave is over — employee left work when the leave started
        label = `Salió a las ${formatTime(leave.starts_at)} (permiso ${payLabel})`
    } else {
        label = `Permiso ${payLabel} hasta ${formatTime(leave.ends_at)}`
    }

    return (
        <div
            data-testid="leave-chip-scheduled"
            className="flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2"
        >
            <CalendarX className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                {label}
            </span>
        </div>
    )
}

// ── Main Component ──────────────────────────────────────────────────────────────

export interface EmployeeAttendanceCardProps {
    row: TodayAttendanceRow
    onCheckIn: (row: TodayAttendanceRow) => void
    onLunchStart: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
    onLunchReturn: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
    onCheckOut: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
    onOvertimeDecision: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    /** Resolves once the mutation succeeds, false on failure — confirmFalta in
     *  use-employee-attendance-card.ts awaits this before opening the justify-now?
     *  dialog, so a failed mutation never walks the card through the exit-animation
     *  flow toward a bucket it never actually reached. */
    onMarkDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE') => Promise<boolean>
    onWeeklySummary?: (employee: TodayAttendanceEmployee) => void
    onViewAudit?: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    /** Called once the mark-falta flow concludes (justified now or declined), so the
     *  parent can play an exit animation before the card leaves the current tab. */
    onFaltaFlowComplete?: (employeeId: string) => void
    /** True while the card is playing its exit animation before leaving the grid. */
    isExiting?: boolean
    /** True while THIS employee's markDayStatus mutation is in flight — scoped per
     *  card (not the mutation's own page-wide isPending) since two absence writes for
     *  different employees can genuinely overlap. Disables both "Registrar entrada"
     *  and "Marcar falta" (either could race the in-flight day-status write for this
     *  employee) and shows a spinner on "Marcar falta" so the manager isn't left with
     *  no feedback while the request is in flight. */
    isMarkingDayStatus?: boolean
    canEdit?: boolean
    /** True when the user may correct an already-recorded event (canEdit + attendances.update permission). */
    canCorrect?: boolean
}

export function EmployeeAttendanceCard({
    row,
    onCheckIn,
    onLunchStart,
    onLunchReturn,
    onCheckOut,
    onOvertimeDecision,
    onMarkDayStatus,
    onWeeklySummary,
    onViewAudit,
    onFaltaFlowComplete,
    isExiting = false,
    isMarkingDayStatus = false,
    canEdit = true,
    canCorrect = false,
}: Readonly<EmployeeAttendanceCardProps>) {
    const att = row.attendance
    const leave = row.today_leave
    const {
        phase,
        isScheduledRestDay,
        isFullDayLeave,
        isPendingVacation,
        displayedActionsPhase,
        actionsFadingOut,
        confirmFaltaOpen,
        openConfirmFalta,
        closeConfirmFalta,
        confirmFalta,
        askJustifyOpen,
        declineJustifyNow,
        acceptJustifyNow,
        showJustifyDialog,
        openJustifyDialog,
        closeJustifyDialog,
    } = useEmployeeAttendanceCard(row, onMarkDayStatus, onFaltaFlowComplete)

    function renderPendingActions() {
        if (isFullDayLeave || isPendingVacation) {
            return null
        }
        return (
            <>
                {isScheduledRestDay && (
                    <div className="flex items-center gap-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2">
                        <BedDouble className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                            Descanso programado
                        </span>
                    </div>
                )}
                <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onCheckIn(row)}
                    disabled={isMarkingDayStatus}
                >
                    <LogIn className="h-3.5 w-3.5 mr-1.5" />
                    Registrar entrada
                </Button>
                {!isScheduledRestDay && (
                    <Button
                        size="sm"
                        variant="outline-danger"
                        className="w-full"
                        data-testid="btn-mark-falta"
                        onClick={openConfirmFalta}
                        disabled={isMarkingDayStatus}
                    >
                        {isMarkingDayStatus
                            ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            : <UserX className="h-3.5 w-3.5 mr-1.5" />}
                        Marcar falta
                    </Button>
                )}
            </>
        )
    }

    return (
        <div
            className={cn(
                'rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors',
                getPhaseCardClass(phase),
                isExiting && 'animate-card-exit pointer-events-none'
            )}
        >
            {/* Header: Name + Phase Badge + Weekly Summary */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground">
                        {formatLastFirst(row.employee.user)}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.employee.code}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {onWeeklySummary && (
                        <button
                            type="button"
                            data-testid="btn-weekly-summary"
                            aria-label="Ver resumen semanal"
                            onClick={() => onWeeklySummary(row.employee)}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <BarChart3 className="h-4 w-4" />
                        </button>
                    )}
                    {onViewAudit && att?.id && (
                        <button
                            type="button"
                            data-testid="btn-view-audit"
                            aria-label="Ver historial de auditoría"
                            onClick={() => onViewAudit(row.employee, att.id)}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <History className="h-4 w-4" />
                        </button>
                    )}
                    <PhaseBadge phase={phase} />
                </div>
            </div>

            {/* Role badges */}
            <RoleBadges roles={row.employee.roles} />

            {/* Leave context chip (shown when there is an approved leave covering today) */}
            {leave && <LeaveChip leave={leave} />}

            {/* Vacation context chip — mirrors the "Descanso programado" chip; shown
                whenever renderPendingActions suppresses check-in/falta for this reason,
                so the card never looks empty for an employee on approved vacation. */}
            {isPendingVacation && (
                <div className="flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2">
                    <CalendarX className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                        Vacaciones aprobadas
                    </span>
                </div>
            )}

            {/* Attendance details — both canEdit (date rule) and canCorrect (attendances.update)
                must hold before a correction pencil is shown, so an inconsistent prop
                combination never offers a correction the backend would reject with 403. */}
            <AttendanceEventList
                row={row}
                canCorrect={canEdit && canCorrect}
                onCheckIn={onCheckIn}
                onLunchStart={onLunchStart}
                onLunchReturn={onLunchReturn}
                onCheckOut={onCheckOut}
            />

            {/* Lock indicator for past-day view (manager cannot edit) */}
            {!canEdit && ['pending', 'checked-in', 'at-lunch', 'returned'].includes(phase) && (
                <div className="flex items-center gap-1.5 rounded-md bg-muted/50 border border-muted px-3 py-2 mt-auto">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground">Solo lectura — día pasado</span>
                </div>
            )}

            {/* Actions for pending employees */}
            {canEdit && displayedActionsPhase === 'pending' && (
                <div className={cn('flex flex-col gap-1.5 mt-auto', actionsFadingOut && 'animate-fade-out pointer-events-none')}>
                    {renderPendingActions()}
                </div>
            )}

            {/* Justify an already-marked falta — registers a direct leave for today,
                which overwrites the ABSENCE attendance record with the chosen type. */}
            {canEdit && displayedActionsPhase === 'absence' && (
                <div className={cn('flex flex-col gap-1.5 mt-auto', !actionsFadingOut && 'animate-fade-in')}>
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        data-testid="btn-justify-absence"
                        onClick={openJustifyDialog}
                    >
                        <CalendarX className="h-3.5 w-3.5 mr-1.5" />
                        Justificar falta
                    </Button>
                </div>
            )}

            {/* Confirm-falta dialog */}
            <ConfirmDialog
                isOpen={confirmFaltaOpen}
                onClose={closeConfirmFalta}
                onConfirm={confirmFalta}
                title="¿Confirmar falta?"
                description={`${formatLastFirst(row.employee.user)} no tiene registro de entrada. ¿Confirmar que faltó hoy?`}
                confirmLabel="Confirmar falta"
                variant="danger"
                container="viewport"
            />

            {/* Ask whether to justify the falta right away */}
            <ConfirmDialog
                isOpen={askJustifyOpen}
                onClose={declineJustifyNow}
                onConfirm={acceptJustifyNow}
                title="¿Deseas justificar la falta ahora?"
                description="Puedes registrar el motivo de la ausencia ahora, o hacerlo después desde la pestaña Ausentes."
                confirmLabel="Justificar ahora"
                cancelLabel="Ahora no"
                variant="info"
                container="viewport"
            />

            {/* Justify-falta dialog — direct leave registration (not a request) */}
            <RegisterLeaveDialog
                isOpen={showJustifyDialog}
                employee={row.employee}
                onClose={closeJustifyDialog}
            />

            {/* Lunch-start action — only for checked-in employees */}
            {canEdit && phase === 'checked-in' && att && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => onLunchStart(row.employee, att.id)}
                >
                    <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
                    Salir a comer
                </Button>
            )}

            {/* Lunch-return action — only for employees at lunch */}
            {canEdit && phase === 'at-lunch' && att && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => onLunchReturn(row.employee, att.id)}
                >
                    <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                    Regresar de comida
                </Button>
            )}

            {/* Check-out action — only for employees who returned from lunch */}
            {canEdit && phase === 'returned' && att && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => onCheckOut(row.employee, att.id)}
                >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Registrar salida
                </Button>
            )}

            {/* Overtime section: pending decision button, pending-read-only badge, or decision badge */}
            {att && (att.overtime_minutes ?? 0) > 0 && (() => {
                if (canEdit && att.requires_overtime_decision) {
                    return (
                        <Button
                            size="sm"
                            variant="outline-warning"
                            className="w-full"
                            onClick={() => onOvertimeDecision(row.employee, att.id)}
                            data-testid="btn-overtime-decision"
                        >
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            Decidir horas extra ({att.overtime_minutes} min)
                        </Button>
                    )
                }
                if (att.requires_overtime_decision) {
                    return <OvertimeAlert overtimeMinutes={att.overtime_minutes ?? 0} />
                }
                return (
                    <OvertimeDecisionBadge
                        authorized={att.overtime_authorized}
                        minutes={att.overtime_minutes ?? 0}
                    />
                )
            })()}
        </div>
    )
}
