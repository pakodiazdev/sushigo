import { useState } from 'react'
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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { getAttendancePhase, formatTime, formatSeconds, parseIsoToUtcMs } from '@/types/attendance'
import type {
    TodayAttendanceRow,
    AttendancePhase,
    TodayAttendanceEmployee,
    TodayLeave,
} from '@/types/attendance'
import { getPhaseCardClass } from './attendance-helpers'

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
}

export function TimeRow({ icon, label, value }: Readonly<TimeRowProps>) {
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
    nowMs?: number  // injectable for tests; defaults to Date.now()
}

export function LeaveChip({ leave, nowMs = Date.now() }: Readonly<LeaveChipProps>) {
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
    } else if (startsAtMs !== null && startsAtMs > nowMs) {
        // Leave hasn't started yet — employee will arrive at work when the leave ends
        label = `Llega a las ${formatTime(leave.ends_at)} (permiso ${payLabel})`
    } else if (endsAtMs < nowMs) {
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
    onLunchStart: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    onLunchReturn: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    onCheckOut: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    onOvertimeDecision: (employee: TodayAttendanceEmployee, attendanceId: string) => void
    onMarkDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE') => void
    canEdit?: boolean
}

export function EmployeeAttendanceCard({
    row,
    onCheckIn,
    onLunchStart,
    onLunchReturn,
    onCheckOut,
    onOvertimeDecision,
    onMarkDayStatus,
    canEdit = true,
}: Readonly<EmployeeAttendanceCardProps>) {
    const phase = getAttendancePhase(row.attendance)
    const att = row.attendance
    const leave = row.today_leave
    const [confirmFaltaOpen, setConfirmFaltaOpen] = useState(false)

    const isScheduledRestDay = row.schedule?.is_day_off === true
    const isFullDayLeave = leave?.time_mode === 'OPEN_ENDED'

    function renderPendingActions() {
        if (isFullDayLeave) {
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
                >
                    <LogIn className="h-3.5 w-3.5 mr-1.5" />
                    Registrar entrada
                </Button>
                {!isScheduledRestDay && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                        data-testid="btn-mark-falta"
                        onClick={() => setConfirmFaltaOpen(true)}
                    >
                        <UserX className="h-3.5 w-3.5 mr-1.5" />
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
                getPhaseCardClass(phase)
            )}
        >
            {/* Header: Name + Phase Badge */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground">
                        {row.employee.last_name}, {row.employee.first_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.employee.code}</p>
                </div>
                <PhaseBadge phase={phase} />
            </div>

            {/* Role badges */}
            <RoleBadges roles={row.employee.roles} />

            {/* Leave context chip (shown when there is an approved leave covering today) */}
            {leave && <LeaveChip leave={leave} />}

            {/* Attendance details */}
            {att ? (
                <div className="space-y-1.5 text-xs">
                    <TimeRow icon="↗" label="Entrada" value={formatTime(att.check_in)} />
                    {(att.entry_late_seconds ?? 0) > 0 && (
                        <LateRow
                            label="Tardanza entrada"
                            value={formatSeconds(att.entry_late_seconds)}
                            deductible={att.is_entry_deductible}
                        />
                    )}
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

            {/* Lock indicator for past-day view (manager cannot edit) */}
            {!canEdit && ['pending', 'checked-in', 'at-lunch', 'returned'].includes(phase) && (
                <div className="flex items-center gap-1.5 rounded-md bg-muted/50 border border-muted px-3 py-2 mt-auto">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground">Solo lectura — día pasado</span>
                </div>
            )}

            {/* Actions for pending employees */}
            {canEdit && phase === 'pending' && (
                <div className="flex flex-col gap-1.5 mt-auto">
                    {renderPendingActions()}
                </div>
            )}

            {/* Confirm-falta dialog */}
            <ConfirmDialog
                isOpen={confirmFaltaOpen}
                onClose={() => setConfirmFaltaOpen(false)}
                onConfirm={() => {
                    setConfirmFaltaOpen(false)
                    onMarkDayStatus(row.employee, 'ABSENCE')
                }}
                title="¿Confirmar falta?"
                description={`${row.employee.last_name}, ${row.employee.first_name} no tiene registro de entrada. ¿Confirmar que faltó hoy?`}
                confirmLabel="Confirmar falta"
                variant="danger"
                container="viewport"
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
                            variant="outline"
                            className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-950/30"
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
